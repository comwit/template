import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readContext, forwardMessage, checkConnection } from "../scripts/comwit-mcp.mjs";

function workspace(t, source) {
  const dir = mkdtempSync(join(tmpdir(), "comwit-mcp-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, ".env"), source);
  return dir;
}
const ENV = "COMWIT_PROJECT_ID=project-a\nUSER_ID=alice\nCOMWIT_CLOUD_TOKEN=cwt_test\n";
test("reads local attribution without inheriting another project's shell context", t => {
  const dir = workspace(t, ENV);
  assert.deepEqual(readContext({ workspace: dir, env: { COMWIT_PROJECT_ID: "project-b", USER_ID: "bob", COMWIT_CLOUD_TOKEN: "cwt_other" } }), { projectId: "project-a", userId: "alice", token: "cwt_test" });
});
test("nullable user is transported as null, and changed env is read on every call", async t => {
  const dir = workspace(t, ENV.replace("USER_ID=alice", "USER_ID="));
  const bodies = [];
  const request = { jsonrpc: "2.0", id: 1, method: "tools/list" };
  const fetchImpl = async (url, options) => {
    assert.equal(url, "https://comwit.io/mcp");
    assert.equal(options.headers.Authorization, "Bearer cwt_test");
    assert.equal(options.redirect, "error");
    bodies.push(JSON.parse(options.body));
    return Response.json({ jsonrpc: "2.0", id: 1, result: { tools: [] } });
  };
  assert.deepEqual(await forwardMessage(request, { workspace: dir, env: {}, fetchImpl }), { jsonrpc: "2.0", id: 1, result: { tools: [] } });
  writeFileSync(join(dir, ".env"), ENV);
  await forwardMessage(request, { workspace: dir, env: {}, fetchImpl });
  assert.deepEqual(bodies, [{ context: { projectId: "project-a", userId: null }, request }, { context: { projectId: "project-a", userId: "alice" }, request }]);
  assert.ok(!JSON.stringify(bodies).includes("cwt_test"));
});
test("hosted session can inject context; missing context never accepts a legacy PAT", t => {
  const dir = workspace(t, "");
  assert.deepEqual(readContext({ workspace: dir, env: { COMWIT_EXECUTION_ENV: "sandbox", COMWIT_PROJECT_ID: "project-a", COMWIT_CLOUD_TOKEN: "cwp_session" } }), { projectId: "project-a", userId: null, token: "cwp_session" });
  assert.throws(() => readContext({ workspace: dir, env: { COMWIT_PROJECT_ID: "project-a" } }), /COMWIT_PROJECT_ID/);
  writeFileSync(join(dir, ".env"), ENV.replace("cwt_test", "cw_pat_legacy"));
  assert.throws(() => readContext({ workspace: dir, env: {} }), /Cloud 인증/);
});
test("transport failures cannot leak credentials or upstream errors", async t => {
  const dir = workspace(t, ENV);
  const request = { jsonrpc: "2.0", id: 7, method: "tools/list" };
  await assert.rejects(forwardMessage(request, { workspace: dir, env: {}, fetchImpl: async () => { throw new Error("secret cwt_test"); } }), error => !error.message.includes("cwt_test") && error.message.includes("연결하지 못했습니다"));
  await assert.rejects(forwardMessage(request, { workspace: dir, env: {}, fetchImpl: async () => new Response("secret cwt_test", { status: 401 }) }), /comwit login/);
});
test("notification acknowledgement produces no MCP response", async t => {
  const dir = workspace(t, ENV);
  assert.equal(await forwardMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, { workspace: dir, env: {}, fetchImpl: async () => new Response(null, { status: 202 }) }), null);
});
test("duplicate context keys are rejected instead of selecting a different identity", t => {
  const dir = workspace(t, ENV + "USER_ID=bob\n");
  assert.throws(() => readContext({ workspace: dir, env: {} }), /duplicate/);
});


test("setup completes only after an authenticated MCP handshake", async t => {
  const dir = workspace(t, ENV);
  const fetchImpl = async (_url, options) => {
    const { request } = JSON.parse(options.body);
    assert.equal(request.method, "initialize");
    return Response.json({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "comwit", version: "1.0" } } });
  };
  assert.deepEqual(await checkConnection({ workspace: dir, env: {}, fetchImpl }), { connected: true });
});

test("valid local env cannot hide an unavailable server or invalid handshake", async t => {
  const dir = workspace(t, ENV);
  for (const response of [
    new Response("unavailable", { status: 503 }),
    Response.json({ jsonrpc: "2.0", id: "comwit-setup-check", error: { code: -32001, message: "denied" } }),
    Response.json({ jsonrpc: "2.0", id: "another-request", result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "comwit" } } }),
    Response.json({}),
  ]) {
    await assert.rejects(checkConnection({ workspace: dir, env: {}, fetchImpl: async () => response }));
  }
});
