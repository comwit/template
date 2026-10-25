import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeProjectEnvironment } from '../scripts/sync-resource-env.mjs';
import { parseEnv } from '../scripts/project-env.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'comwit-context-env-'));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  execFileSync('git', ['init', '-q', root]);
  writeFileSync(join(root, '.gitignore'), '.env\n');
  writeFileSync(join(root, '.env'), 'COMWIT_CLOUD_TOKEN=cwt_never_replace\nUSER_ID=previous-user\nCUSTOM=kept\n');
  return root;
}
test('merges both project IDs without interchanging them, while preserving auth and other keys', t => {
  const root = fixture(t);
  writeProjectEnvironment({ COMWIT_PROJECT: 'cloud-project', COMWIT_PROJECT_ID: 'internal-project', USER_ID: 'alice' }, { workspaceRoot: root });
  const values = parseEnv(readFileSync(join(root, '.env'), 'utf8'));
  assert.equal(values.get('COMWIT_PROJECT'), 'cloud-project');
  assert.equal(values.get('COMWIT_PROJECT_ID'), 'internal-project');
  assert.equal(values.get('USER_ID'), 'alice');
  assert.equal(values.get('COMWIT_CLOUD_TOKEN'), 'cwt_never_replace');
  assert.equal(values.get('CUSTOM'), 'kept');
});
test('null, omitted, and empty user clear stale attribution in a new context snapshot', t => {
  const root = fixture(t);
  for (const userId of [null, undefined, '']) {
    writeFileSync(join(root, '.env'), 'USER_ID=old-user\n');
    writeProjectEnvironment({ COMWIT_PROJECT: 'cloud-project', COMWIT_PROJECT_ID: 'internal-project', ...(userId === undefined ? {} : { USER_ID: userId }) }, { workspaceRoot: root });
    assert.equal(parseEnv(readFileSync(join(root, '.env'), 'utf8')).has('USER_ID'), false);
  }
});
test('old context payloads preserve existing attribution and invalid new payloads leave env unchanged', t => {
  const root = fixture(t);
  writeProjectEnvironment({ COMWIT_PROJECT: 'cloud-project' }, { workspaceRoot: root });
  const before = readFileSync(join(root, '.env'), 'utf8');
  assert.equal(parseEnv(before).get('USER_ID'), 'previous-user');
  assert.throws(() => writeProjectEnvironment({ COMWIT_PROJECT: 'cloud-project', USER_ID: 'alice' }, { workspaceRoot: root }), /COMWIT_PROJECT_ID/);
  assert.throws(() => writeProjectEnvironment({ COMWIT_PROJECT: 'cloud-project', COMWIT_PROJECT_ID: 'internal-project', USER_ID: 3 }, { workspaceRoot: root }), /USER_ID/);
  assert.equal(readFileSync(join(root, '.env'), 'utf8'), before);
});
