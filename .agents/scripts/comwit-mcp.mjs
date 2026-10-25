#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createInterface } from "node:readline";
import { parseEnv } from "./project-env.mjs";

const WORKSPACE = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ENDPOINT = "https://comwit.io/mcp";
const MAX_MESSAGE_BYTES = 32 * 1024 * 1024;

export function readContext({ workspace = WORKSPACE, env = process.env } = {}) {
  const file = resolve(workspace, ".env");
  const local = existsSync(file) ? Object.fromEntries(parseEnv(readFileSync(file, "utf8"))) : {};
  // Local project context never falls back to another project's inherited shell env.
  // Hosted workspaces may inject their context directly without a local env file.
  const values = env.COMWIT_EXECUTION_ENV === "sandbox" ? { ...local, ...env } : local;
  const projectId = values.COMWIT_PROJECT_ID?.trim();
  const userId = values.USER_ID?.trim() || null;
  const token = values.COMWIT_CLOUD_TOKEN?.trim();
  if (!projectId || projectId.length > 256 || /[\s\x00-\x1f]/.test(projectId)) {
    throw new Error("COMWIT_PROJECT_ID가 없거나 올바르지 않습니다. 컴윗의 프로젝트 설정 프롬프트를 실행해 주세요.");
  }
  if (userId && (userId.length > 256 || /[\x00-\x1f]/.test(userId))) throw new Error("USER_ID를 확인해 주세요.");
  if (!token || !/^(cwt|cwp)_[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("Cloud 인증이 없습니다. comwit login 후 comwit auth export-token --env-out .env를 실행해 주세요.");
  }
  return { projectId, userId, token };
}

export async function forwardMessage(message, { fetchImpl = fetch, ...options } = {}) {
  if (!message || typeof message !== "object" || Array.isArray(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    throw new Error("올바른 MCP JSON-RPC 요청이 아닙니다.");
  }
  // Re-read per request: setup, login refresh and USER_ID edits take effect without a stale in-memory identity.
  const { projectId, userId, token } = readContext(options);
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ context: { projectId, userId }, request: message }),
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
  } catch {
    throw new Error("컴윗 MCP에 연결하지 못했습니다. 연결 상태를 확인해 주세요.");
  }
  if (!response.ok) {
    const hint = response.status === 401 ? "comwit login 후 comwit auth export-token --env-out .env를 실행해 주세요." : response.status === 403 ? "프로젝트 접근 권한과 Cloud 전환 설정을 확인해 주세요." : "잠시 후 다시 시도해 주세요.";
    throw new Error(`컴윗 MCP 요청 실패 (${response.status}). ${hint}`);
  }
  if (response.status === 202 || response.status === 204) return null;
  try { return await response.json(); }
  catch { throw new Error("컴윗 MCP 응답을 확인하지 못했습니다."); }
}

export async function checkConnection(options = {}) {
  const response = await forwardMessage({
    jsonrpc: "2.0", id: "comwit-setup-check", method: "initialize",
    params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "comwit-project-setup", version: "1.0.0" } },
  }, options);
  if (response?.jsonrpc !== "2.0" || response.id !== "comwit-setup-check" || response.error ||
      typeof response.result?.protocolVersion !== "string" || !response.result?.capabilities?.tools ||
      typeof response.result?.serverInfo?.name !== "string") {
    throw new Error("컴윗 MCP 연결을 확인하지 못했습니다. 프로젝트 설정이 아직 완료되지 않았습니다.");
  }
  return { connected: true };
}

async function run() {
  if (process.argv.includes("--check")) {
    await checkConnection();
    process.stdout.write("COMWIT_MCP_READY\n");
    return;
  }
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let request;
    try {
      if (Buffer.byteLength(line, "utf8") > MAX_MESSAGE_BYTES) throw new Error("MCP 요청이 너무 큽니다.");
      try { request = JSON.parse(line); } catch { throw new Error("MCP JSON 요청을 읽지 못했습니다."); }
      const response = await forwardMessage(request);
      if (response !== null && request.id !== undefined) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      if (request && request.id === undefined) continue;
      const id = typeof request?.id === "string" || typeof request?.id === "number" ? request.id : null;
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32001, message: error.message } })}\n`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().catch(() => { process.stderr.write("컴윗 MCP 설정을 확인해 주세요.\n"); process.exitCode = 1; });
}
