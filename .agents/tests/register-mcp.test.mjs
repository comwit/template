import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { register, scriptPath } from "../scripts/register-mcp.mjs";

function workspace(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "comwit mcp "));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const localScript = path.join(directory, ".agents/scripts/register-mcp.mjs");
  fs.mkdirSync(path.dirname(localScript), { recursive: true });
  fs.copyFileSync(scriptPath, localScript);
  return directory;
}

const put = (directory, name, value) => {
  fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
  fs.writeFileSync(path.join(directory, name), value);
};
const cli = (directory, args, env = {}) => spawnSync(process.execPath, [path.join(directory, ".agents/scripts/register-mcp.mjs"), ...args], {
  cwd: directory, encoding: "utf8", env: { ...process.env, COMWIT_API_TOKEN: "", COMWIT_PAT: "", ...env },
});

test("writes both runtimes with an environment reference and never the token value", (t) => {
  const directory = workspace(t);
  put(directory, ".mcp.json", JSON.stringify({ mcpServers: { personal: { command: "example" } } }));
  put(directory, ".codex/config.toml", 'model = "example"\n\n[mcp_servers.personal]\ncommand = "example"\n');
  const result = cli(directory, ["--url", "https://comwit.io/mcp/project-123"], { COMWIT_API_TOKEN: "test-secret-never-output" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("test-secret-never-output"), false);
  const claude = JSON.parse(fs.readFileSync(path.join(directory, ".mcp.json"), "utf8"));
  const codex = fs.readFileSync(path.join(directory, ".codex/config.toml"), "utf8");
  assert.deepEqual(claude.mcpServers.comwit, { type: "http", url: "https://comwit.io/mcp/project-123", headers: { Authorization: "Bearer ${COMWIT_API_TOKEN}" } });
  assert.deepEqual(claude.mcpServers.personal, { command: "example" });
  assert.match(codex, /bearer_token_env_var = "COMWIT_API_TOKEN"/);
  assert.match(codex, /model = "example"/);
  assert.match(codex, /\[mcp_servers.personal\]/);
  assert.equal(codex.includes("test-secret-never-output"), false);
  assert.equal(codex.includes("${"), false);
  assert.equal(fs.existsSync(path.join(directory, ".agents/scripts/register-mcp.mjs")), false);
});

test("supports the legacy token variable and removes the setup script after success", (t) => {
  const directory = workspace(t);
  assert.equal(cli(directory, ["--url", "https://comwit.io/mcp/project-123"], { COMWIT_PAT: "fallback" }).status, 0);
  assert.match(fs.readFileSync(path.join(directory, ".codex/config.toml"), "utf8"), /bearer_token_env_var = "COMWIT_PAT"/);
  assert.equal(fs.readFileSync(path.join(directory, ".codex/config.toml"), "utf8").match(/comwit:mcp:begin/g).length, 1);
  assert.equal(fs.existsSync(path.join(directory, ".agents/scripts/register-mcp.mjs")), false);
});

test("starts from nothing and is idempotent", (t) => {
  const directory = workspace(t);
  register({ workspace: directory, url: "https://comwit.io/mcp/p", env: { COMWIT_API_TOKEN: "x" } });
  const first = [".mcp.json", ".codex/config.toml"].map((file) => fs.readFileSync(path.join(directory, file), "utf8"));
  register({ workspace: directory, url: "https://comwit.io/mcp/p", env: { COMWIT_API_TOKEN: "x" } });
  assert.deepEqual([".mcp.json", ".codex/config.toml"].map((file) => fs.readFileSync(path.join(directory, file), "utf8")), first);
});

test("conflicts and missing credentials fail without touching either file", (t) => {
  const directory = workspace(t);
  assert.notEqual(cli(directory, ["--url", "https://comwit.io/mcp/example"]).status, 0);
  assert.equal(fs.existsSync(path.join(directory, ".mcp.json")), false);
  const previous = '[mcp_servers.comwit]\nurl = "https://example.com/original"\n';
  put(directory, ".codex/config.toml", previous);
  const result = cli(directory, ["--url", "https://comwit.io/mcp/new"], { COMWIT_API_TOKEN: "x" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unmanaged Codex/);
  assert.equal(fs.existsSync(path.join(directory, ".mcp.json")), false);
  assert.equal(fs.readFileSync(path.join(directory, ".codex/config.toml"), "utf8"), previous);
  assert.notEqual(cli(directory, ["--url", "http://comwit.io/mcp/plain"], { COMWIT_API_TOKEN: "x" }).status, 0);
  assert.equal(fs.existsSync(path.join(directory, ".agents/scripts/register-mcp.mjs")), true);
});


test("keeps the setup script when the second config cannot be written, allowing a retry", (t) => {
  const directory = workspace(t);
  put(directory, ".codex", "blocks config directory creation");
  const args = ["--url", "https://comwit.io/mcp/project-123"];
  const result = cli(directory, args, { COMWIT_API_TOKEN: "x" });
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(path.join(directory, ".agents/scripts/register-mcp.mjs")), true);
  assert.equal(fs.existsSync(path.join(directory, ".codex/config.toml")), false);
  fs.unlinkSync(path.join(directory, ".codex"));
  const retry = cli(directory, args, { COMWIT_API_TOKEN: "x" });
  assert.equal(retry.status, 0, retry.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, ".mcp.json"), "utf8")).mcpServers.comwit.url, args[1]);
  assert.match(fs.readFileSync(path.join(directory, ".codex/config.toml"), "utf8"), /bearer_token_env_var = "COMWIT_API_TOKEN"/);
  assert.equal(fs.existsSync(path.join(directory, ".agents/scripts/register-mcp.mjs")), false);
});
