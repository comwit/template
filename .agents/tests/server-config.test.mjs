import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../../src/server/config.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function loadConfig(env = {}) {
  const exports = {};
  runInNewContext(outputText, {
    exports,
    process: { env },
    require(name) {
      assert.equal(name, 'server-only');
      return {};
    },
  });
  return { env, ...exports };
}

test('server settings observe late injection, rotation and removal without reimporting', () => {
  const { env, config, requireServerConfig } = loadConfig();
  for (const key of [
    'COMWIT_PROJECT', 'COMWIT_APP', 'COMWIT_DATABASE_ID', 'DATABASE_URL',
    'COMWIT_STORAGE_ID', 'COMWIT_STORAGE_ENDPOINT', 'COMWIT_STORAGE_BUCKET',
    'COMWIT_STORAGE_PUBLIC_BASE_URL', 'COMWIT_CLOUD_TOKEN',
  ]) {
    assert.equal(config[key], undefined);
    env[key] = `${key}-first`;
    assert.equal(config[key], `${key}-first`);
    assert.equal(requireServerConfig(key), `${key}-first`);
    env[key] = `${key}-rotated`;
    assert.equal(config[key], `${key}-rotated`);
    assert.equal(requireServerConfig(key), `${key}-rotated`);
    delete env[key];
    assert.equal(config[key], undefined);
    assert.throws(() => requireServerConfig(key), { message: `Required server configuration is missing: ${key}` });
  }
});

test('NODE_ENV fallback and derived SITE_URL are recalculated on access', () => {
  const { env, config } = loadConfig();
  assert.equal(config.NODE_ENV, 'production');
  assert.equal(config.SITE_URL, undefined);
  env.NODE_ENV = 'development';
  env.COMWIT_APP = 'svc_first';
  assert.equal(config.NODE_ENV, 'development');
  assert.equal(config.SITE_URL, 'https://first.app.comwit.link');
  env.COMWIT_APP = 'second';
  assert.equal(config.SITE_URL, 'https://second.app.comwit.link');
  env.COMWIT_APP = '';
  assert.equal(config.SITE_URL, undefined);
  delete env.NODE_ENV;
  assert.equal(config.NODE_ENV, 'production');
});

test('required settings reject blank values without exposing credentials', () => {
  const { env, requireServerConfig } = loadConfig({ COMWIT_CLOUD_TOKEN: 'fixture-secret' });
  assert.equal(requireServerConfig('COMWIT_CLOUD_TOKEN'), 'fixture-secret');
  env.COMWIT_CLOUD_TOKEN = '  ';
  assert.throws(() => requireServerConfig('COMWIT_CLOUD_TOKEN'), { message: 'Required server configuration is missing: COMWIT_CLOUD_TOKEN' });
});

test('course platform and auth settings read late bindings and keep app URL overrides', () => {
  const { env, config } = loadConfig();
  assert.equal(config.ORDER_EXPIRY_MINUTES, '30');
  for (const key of ['APP_AUTH_SECRET', 'ADMIN_AUTH_SECRET', 'TOSS_SECRET_KEY', 'COURSE_CRON_SECRET']) {
    assert.equal(config[key], undefined);
    env[key] = 'fixture-value';
    assert.equal(config[key], 'fixture-value');
    delete env[key];
    assert.equal(config[key], undefined);
  }
  env.ORDER_EXPIRY_MINUTES = '60';
  assert.equal(config.ORDER_EXPIRY_MINUTES, '60');
  env.APP_URL = 'https://course.example.test';
  assert.equal(config.SITE_URL, env.APP_URL);
  env.SITE_URL = 'https://store.example.test';
  assert.equal(config.SITE_URL, env.SITE_URL);
});
