import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '../..');
const binary = join(dirname(require.resolve('oxlint/package.json')), 'bin/oxlint');

function lint(t, source, path = 'src/server/repository/orders/index.ts') {
  const directory = mkdtempSync(join(tmpdir(), 'comwit transaction lint '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const config = join(directory, 'oxlint.json');
  const file = join(directory, path);
  mkdirSync(dirname(file), { recursive: true });
  const projectConfig = JSON.parse(readFileSync(join(root, '.oxlintrc.json'), 'utf8'));
  assert.equal(projectConfig.rules['custom/no-db-transaction'], 'error');
  writeFileSync(config, JSON.stringify({
    categories: { correctness: 'off' },
    jsPlugins: [{ name: 'custom', specifier: join(root, 'eslint-rules/index.cjs') }],
    rules: { 'custom/no-db-transaction': projectConfig.rules['custom/no-db-transaction'] },
  }));
  writeFileSync(file, source);
  const result = spawnSync(process.execPath, [binary, '--config', config, '--format', 'json', file], { encoding: 'utf8', cwd: root });
  assert.ok(result.status === 0 || result.status === 1, result.stderr);
  const diagnostics = JSON.parse(result.stdout).diagnostics;
  assert.ok(diagnostics.every(item => item.code?.includes('no-db-transaction')), result.stdout);
  assert.equal(result.status, diagnostics.length ? 1 : 0);
  return diagnostics;
}

test('rejects transaction calls regardless of client name, including computed and optional calls', t => {
  const errors = lint(t, `
    db.transaction(async tx => tx.insert(table));
    database['transaction'](() => {});
    db?.transaction(() => {});
    db.transaction?.(() => {});
    (await getDb()).transaction(() => {});
  `);
  assert.equal(errors.length, 5);
  assert.ok(errors.every(error => error.message.includes('current Comwit Cloud HTTP transport')));
});

test('allows regular queries, batches and transaction data fields', t => {
  assert.deepEqual(lint(t, `
    db.select().from(table);
    db.insert(table).values({ transaction: 'payment' });
    db.batch([query]);
    const transaction = row.transaction;
  `), []);
});

test('only restricts repository files', t => {
  for (const path of ['src/lib/payment.ts', 'src/server/repository-utils.ts']) {
    assert.deepEqual(lint(t, 'client.transaction(() => {});', path), []);
  }
});
