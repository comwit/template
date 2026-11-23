import assert from "node:assert/strict";
import { test } from "node:test";
import { appLink, childEnv, gitProblem, isSafeId, readEnvKeys, resolveDeployEnv } from "../../scripts/deploy-lib.mjs";

test("deploy reads only its keys from .env, with comments, export prefixes and quotes", () => {
  const source = [
    "# Comwit",
    'export COMWIT_PROJECT="prj_1"',
    "COMWIT_APP='svc_app' ",
    "COMWIT_EXECUTION_ENV=local # set by setup",
    "NODE_ENV=development",
    "COMWIT_CLOUD_TOKEN=cwt_secret",
    "",
  ].join("\r\n");
  assert.deepEqual(readEnvKeys(source), { COMWIT_PROJECT: "prj_1", COMWIT_APP: "svc_app", COMWIT_EXECUTION_ENV: "local" });
  assert.deepEqual(readEnvKeys('COMWIT_APP=a\nCOMWIT_APP="b # c"\n'), { COMWIT_APP: "b # c" });
});

test("deploy prefers process env and falls back to .env for empty or missing values", () => {
  const file = "COMWIT_PROJECT=from_file\nCOMWIT_APP=svc_file\nCOMWIT_EXECUTION_ENV=local\n";
  assert.deepEqual(resolveDeployEnv({ COMWIT_PROJECT: "from_env", COMWIT_APP: "" }, file), {
    project: "from_env",
    app: "svc_file",
    executionEnv: "local",
  });
  assert.deepEqual(resolveDeployEnv({}, ""), { project: "", app: "", executionEnv: "" });
});

test("deploy builds the link, accepts only ids and drops NODE_ENV for children", () => {
  assert.equal(appLink("svc_abc123"), "https://abc123.app.comwit.link");
  assert.equal(appLink("abc123"), "https://abc123.app.comwit.link");
  assert.equal(isSafeId("svc_abc-1.2"), true);
  assert.equal(isSafeId("--token"), false);
  assert.equal(isSafeId("a b"), false);
  const env = { NODE_ENV: "development", PATH: "/bin" };
  assert.deepEqual(childEnv(env), { PATH: "/bin" });
  assert.equal(env.NODE_ENV, "development");
});

test("deploy refuses uncommitted, unpushed, untracked-upstream and detached work", () => {
  const clean = { porcelain: "", branch: "main", upstream: "origin/main", ahead: 0 };
  assert.equal(gitProblem(clean), null);
  const dirty = gitProblem({ ...clean, porcelain: " M src/a.ts\n?? notes.txt\n" });
  assert.match(dirty, /커밋하지 않은 변경/);
  assert.match(dirty, / M src\/a\.ts/);
  assert.match(dirty, /\?\? notes\.txt/);
  assert.match(gitProblem({ ...clean, ahead: 2 }), /push하지 않은 커밋이 2개/);
  assert.match(gitProblem({ ...clean, upstream: null }), /git push -u origin main/);
  assert.match(gitProblem({ ...clean, branch: "" }), /detached HEAD/);
});
