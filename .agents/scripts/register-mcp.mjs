#!/usr/bin/env node
// Registers the Comwit MCP server for Claude Code (`.mcp.json`) and Codex
// (managed block in `.codex/config.toml`). Only the token *variable name* is
// written; the value stays in the shell environment.
// One-time setup: the CLI removes this script only after both configs are saved.
//
//   node .agents/scripts/register-mcp.mjs --url https://comwit.io/mcp/<project>
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SERVER_NAME = "comwit";
const MCP_BEGIN = "# comwit:mcp:begin";
const MCP_END = "# comwit:mcp:end";

const tomlKey = (key) => (/^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key));

function tomlValue(value, where) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => tomlValue(item, where)).join(", ")}]`;
  throw new Error(`unsupported MCP value at ${where}`);
}

// Codex does not expand `${VAR}` inside `http_headers`: the literal text would be sent
// and auth would fail. Claude Code's `.mcp.json` does expand it. So the canonical form
// keeps `headers.Authorization: "Bearer ${VAR}"` (and any header that is exactly
// `${VAR}`), and the Codex block gets the fields Codex resolves from the environment
// itself: `bearer_token_env_var = "VAR"` and `env_http_headers`. Static headers stay in
// `http_headers`.
const ENV_REF = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;
const BEARER_ENV_REF = /^Bearer \$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;

function toCodexServer(server) {
  const codex = {};
  for (const [key, value] of Object.entries(server)) {
    if (key === "type") continue;
    if (key !== "headers" || !value || typeof value !== "object" || Array.isArray(value)) {
      codex[key] = value;
      continue;
    }
    const staticHeaders = {};
    const envHeaders = {};
    for (const [header, raw] of Object.entries(value)) {
      const bearer = typeof raw === "string" && header.toLowerCase() === "authorization" && BEARER_ENV_REF.exec(raw);
      if (bearer) {
        codex.bearer_token_env_var = bearer[1];
        continue;
      }
      const env = typeof raw === "string" && ENV_REF.exec(raw);
      if (env) {
        envHeaders[header] = env[1];
        continue;
      }
      staticHeaders[header] = raw;
    }
    if (Object.keys(staticHeaders).length) codex.http_headers = staticHeaders;
    if (Object.keys(envHeaders).length) codex.env_http_headers = envHeaders;
  }
  return codex;
}

export function renderMcpToml(servers) {
  const lines = [`${MCP_BEGIN} — Comwit MCP project configuration`];
  for (const name of Object.keys(servers).sort()) {
    const server = toCodexServer(servers[name] ?? {});
    const table = `mcp_servers.${tomlKey(name)}`;
    const scalars = [];
    const subtables = [];
    for (const [key, value] of Object.entries(server)) {
      if (value && typeof value === "object" && !Array.isArray(value)) subtables.push([key, value]);
      else scalars.push(`${tomlKey(key)} = ${tomlValue(value, `${name}.${key}`)}`);
    }
    lines.push(`[${table}]`, ...scalars);
    for (const [sub, values] of subtables) {
      lines.push(`[${table}.${tomlKey(sub)}]`);
      for (const [key, value] of Object.entries(values)) {
        lines.push(`${tomlKey(key)} = ${tomlValue(value, `${name}.${sub}.${key}`)}`);
      }
    }
  }
  lines.push(MCP_END);
  return `${lines.join("\n")}\n`;
}

/** Replaces the managed block in a Codex config, keeping everything else verbatim. */
export function codexConfig(current, servers) {
  const lines = current.split(/\r?\n/);
  const first = lines.findIndex((line) => line.startsWith(MCP_BEGIN));
  const last = lines.findIndex((line) => line.trim() === MCP_END);
  if ((first < 0) !== (last < 0) || (first >= 0 && last < first)) throw new Error("Malformed managed MCP block in .codex/config.toml");
  const outside = first < 0 ? current : [...lines.slice(0, first), ...lines.slice(last + 1)].join("\n");
  for (const name of Object.keys(servers)) {
    // Match table names without interpreting regex metacharacters in server names.
    const tables = outside.match(/^\s*\[mcp_servers\.[^\n]+/gm) ?? [];
    if (tables.some((table) => [name, JSON.stringify(name), `'${name}'`].some((key) => {
      const suffix = table.trimStart().slice("[mcp_servers.".length);
      return suffix.startsWith(`${key}]`) || suffix.startsWith(`${key}.`);
    }))) throw new Error(`Unmanaged Codex MCP server "${name}" already exists in .codex/config.toml; remove it first`);
  }
  const block = Object.keys(servers).length ? renderMcpToml(servers).trimEnd() : "";
  const parts = first < 0
    ? [current.trimEnd(), block]
    : [lines.slice(0, first).join("\n").trimEnd(), block, lines.slice(last + 1).join("\n").trim()];
  return parts.filter(Boolean).join("\n\n") + (parts.some(Boolean) ? "\n" : "");
}

function writeAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, content, { flag: "wx" });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export function register({ workspace = process.cwd(), url, env = process.env } = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("MCP needs an HTTPS URL without credentials");
  const variable = env.COMWIT_API_TOKEN ? "COMWIT_API_TOKEN" : env.COMWIT_PAT ? "COMWIT_PAT" : null;
  if (!variable) throw new Error("COMWIT_API_TOKEN or COMWIT_PAT is missing; complete computer connection first");
  const server = { type: "http", url, headers: { Authorization: `Bearer \${${variable}}` } };

  const claudeFile = path.join(workspace, ".mcp.json");
  const claude = fs.existsSync(claudeFile) ? JSON.parse(fs.readFileSync(claudeFile, "utf8")) : {};
  const nextClaude = { ...claude, mcpServers: { ...claude.mcpServers, [SERVER_NAME]: server } };

  const codexFile = path.join(workspace, ".codex", "config.toml");
  const previousCodex = fs.existsSync(codexFile) ? fs.readFileSync(codexFile, "utf8") : "";
  // Validate Codex before touching either file so a conflict leaves both unchanged.
  const nextCodex = codexConfig(previousCodex, { [SERVER_NAME]: server });

  writeAtomic(claudeFile, `${JSON.stringify(nextClaude, null, 2)}\n`);
  writeAtomic(codexFile, nextCodex);
  return { variable };
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const index = args.indexOf("--url");
    if (index < 0 || !args[index + 1] || args.length !== 2) throw new Error("Usage: node .agents/scripts/register-mcp.mjs --url URL");
    const { variable } = register({ url: args[index + 1] });
    fs.unlinkSync(fileURLToPath(import.meta.url));
    console.log(`MCP_REGISTERED ${SERVER_NAME} token-env=${variable} setup-script=removed`);
  } catch (error) {
    console.error(`[agents] ${error.message}`);
    process.exitCode = 1;
  }
}

export const scriptPath = fileURLToPath(import.meta.url);
