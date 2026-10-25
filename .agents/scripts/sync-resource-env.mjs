#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  parseEnv,
  validateDatabaseUrl,
  validateStorageBinding,
} from "./project-env.mjs";

const MAX_STDIN_BYTES = 64 * 1024;

function fail(message) {
  throw new Error(message);
}

function parseArgs(args) {
  let envPath = ".env";
  let resource;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--env" && args[index + 1]) {
      envPath = args[++index];
      continue;
    }
    if (arg === "--resource" && args[index + 1]) {
      resource = args[++index];
      continue;
    }
    fail("unknown atomic env option");
  }
  if (!["project", "database", "storage"].includes(resource)) {
    fail("--resource must be project, database, or storage");
  }
  return { envPath, resource };
}

function findWorkspaceRoot(startPath) {
  let current = resolve(startPath);
  while (true) {
    if (existsSync(join(current, ".agents"))) return current;
    const parent = dirname(current);
    if (parent === current) fail("could not find a workspace containing .agents/");
    current = parent;
  }
}

function git(workspaceRoot, args) {
  return spawnSync("git", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    stdio: "ignore",
  });
}

async function readStructuredInput() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > MAX_STDIN_BYTES) fail("structured resource input is too large");
    chunks.push(chunk);
  }
  if (size === 0) fail("structured resource input is required on stdin");
  const source = Buffer.concat(chunks).toString("utf8");
  assertNoDuplicateTopLevelKeys(source);
  try {
    return JSON.parse(source);
  } catch {
    fail("structured resource input is not valid JSON");
  }
}

function assertNoDuplicateTopLevelKeys(source) {
  const keys = new Set();
  let depth = 0;
  let stringStart = -1;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (stringStart >= 0) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character !== '"') continue;
      if (depth === 1) {
        let before = stringStart - 1;
        while (before >= 0 && /\s/.test(source[before])) before -= 1;
        let after = index + 1;
        while (after < source.length && /\s/.test(source[after])) after += 1;
        if (
          (source[before] === "{" || source[before] === ",") &&
          source[after] === ":"
        ) {
          let key;
          try {
            key = JSON.parse(source.slice(stringStart, index + 1));
          } catch {
            fail("structured resource input is not valid JSON");
          }
          if (keys.has(key)) fail("duplicate structured input key");
          keys.add(key);
        }
      }
      stringStart = -1;
      continue;
    }
    if (character === '"') {
      stringStart = index;
      continue;
    }
    if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") depth -= 1;
  }
}

function exactObject(value, requiredKeys, optionalKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} input must be an object`);
  }
  const actual = Object.keys(value);
  const forbiddenSecretKeys = new Set([
    "COMWIT_API_TOKEN",
    "COMWIT_CLOUD_TOKEN",
    "COMWIT_DEPLOY_TOKEN",
    "COMWIT_PAT",
    "database_token",
    "storage_token",
  ]);
  if (actual.some((key) => forbiddenSecretKeys.has(key))) {
    fail(`${label} input must not contain secret keys`);
  }
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  if (actual.some((key) => !allowed.has(key))) {
    fail(`${label} input has an unexpected key`);
  }
  if (requiredKeys.some((key) => !Object.hasOwn(value, key))) {
    fail(`${label} input is missing a required key`);
  }
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} is missing`);
  assertSafeValue(value, label);
  return value.trim();
}

function projectUpdates(payload) {
  const requiredKeys = ["COMWIT_PROJECT"];
  const optionalKeys = [
    "COMWIT_PROJECT_ID",
    "USER_ID",
    "COMWIT_EXECUTION_ENV",
    "COMWIT_APP",
    "COMWIT_DATABASE_ID",
    "DATABASE_URL",
    "COMWIT_STORAGE_ID",
    "COMWIT_STORAGE_ENDPOINT",
    "COMWIT_STORAGE_BUCKET",
    "COMWIT_STORAGE_PUBLIC_BASE_URL",
    "NODE_ENV",
    "PORT",
  ];
  exactObject(payload, requiredKeys, optionalKeys, "project environment");
  const updates = new Map([
    ["COMWIT_PROJECT", requiredString(payload.COMWIT_PROJECT, "COMWIT_PROJECT")],
    // No selected App must also clear an obsolete App from a prior snapshot.
    ["COMWIT_APP", Object.hasOwn(payload, "COMWIT_APP")
      ? requiredString(payload.COMWIT_APP, "COMWIT_APP") : null],
    // Project handoff is an authoritative binding snapshot. Missing resource
    // groups remove stale local values while leaving credentials and unrelated
    // keys untouched. Resource-specific modes remain replacement-only.
    ["COMWIT_DATABASE_ID", null],
    ["DATABASE_URL", null],
    ["COMWIT_STORAGE_ID", null],
    ["COMWIT_STORAGE_ENDPOINT", null],
    ["COMWIT_STORAGE_BUCKET", null],
    ["COMWIT_STORAGE_PUBLIC_BASE_URL", null],
  ]);

  if (Object.hasOwn(payload, "COMWIT_PROJECT_ID")) {
    updates.set("COMWIT_PROJECT_ID", requiredString(payload.COMWIT_PROJECT_ID, "COMWIT_PROJECT_ID"));
    const userId = payload.USER_ID;
    if (userId !== undefined && userId !== null && typeof userId !== "string") fail("USER_ID must be a string or null");
    if (typeof userId === "string") assertSafeValue(userId, "USER_ID");
    updates.set("USER_ID", typeof userId === "string" ? userId.trim() || null : null);
  } else if (Object.hasOwn(payload, "USER_ID")) {
    fail("USER_ID requires COMWIT_PROJECT_ID");
  }

  if (Object.hasOwn(payload, "COMWIT_EXECUTION_ENV")) {
    if (!["local", "sandbox"].includes(payload.COMWIT_EXECUTION_ENV)) {
      fail("COMWIT_EXECUTION_ENV must be local or sandbox");
    }
    updates.set("COMWIT_EXECUTION_ENV", payload.COMWIT_EXECUTION_ENV);
  }

  const databaseKeys = ["COMWIT_DATABASE_ID", "DATABASE_URL"];
  const providedDatabaseKeys = databaseKeys.filter((key) =>
    Object.hasOwn(payload, key),
  );
  if (providedDatabaseKeys.length > 0 && providedDatabaseKeys.length !== 2) {
    fail("project database ID and URL must be provided together");
  }
  if (providedDatabaseKeys.length === 2) {
    if (
      typeof payload.COMWIT_DATABASE_ID !== "string" ||
      typeof payload.DATABASE_URL !== "string"
    ) {
      fail("project database ID and URL must be strings");
    }
    assertSafeValue(payload.COMWIT_DATABASE_ID, "COMWIT_DATABASE_ID");
    assertSafeValue(payload.DATABASE_URL, "DATABASE_URL");
    const databaseId = payload.COMWIT_DATABASE_ID.trim();
    const databaseUrl = payload.DATABASE_URL.trim();
    if (!databaseId || !databaseUrl) {
      fail(
        "project database ID and URL must both be configured; omit both keys when the snapshot has no database binding",
      );
    }
    updates.set("COMWIT_DATABASE_ID", databaseId);
    updates.set("DATABASE_URL", validateDatabaseUrl(databaseUrl));
  }

  const storageCoreKeys = [
    "COMWIT_STORAGE_ID",
    "COMWIT_STORAGE_ENDPOINT",
    "COMWIT_STORAGE_BUCKET",
  ];
  const providedStorageCore = storageCoreKeys.filter((key) =>
    Object.hasOwn(payload, key),
  );
  if (providedStorageCore.length > 0 && providedStorageCore.length !== 3) {
    fail("project Storage core keys must be provided together");
  }
  if (providedStorageCore.length === 3) {
    const coreValues = storageCoreKeys.map((key) => payload[key]);
    if (coreValues.some((value) => typeof value !== "string")) {
      fail("project Storage core values must be strings");
    }
    for (let index = 0; index < storageCoreKeys.length; index += 1) {
      assertSafeValue(coreValues[index], storageCoreKeys[index]);
    }
    if (
      Object.hasOwn(payload, "COMWIT_STORAGE_PUBLIC_BASE_URL") &&
      payload.COMWIT_STORAGE_PUBLIC_BASE_URL !== null &&
      typeof payload.COMWIT_STORAGE_PUBLIC_BASE_URL !== "string"
    ) {
      fail("COMWIT_STORAGE_PUBLIC_BASE_URL must be a string or null");
    }
    if (coreValues.every((value) => !value.trim())) {
      fail(
        "project Storage core values must be configured; omit the whole group when the snapshot has no Storage binding",
      );
    }
    const binding = validateStorageBinding({
      id: payload.COMWIT_STORAGE_ID,
      endpoint: payload.COMWIT_STORAGE_ENDPOINT,
      bucket: payload.COMWIT_STORAGE_BUCKET,
      publicBaseUrl: payload.COMWIT_STORAGE_PUBLIC_BASE_URL ?? null,
    });
    updates.set("COMWIT_STORAGE_ID", binding.id);
    updates.set("COMWIT_STORAGE_ENDPOINT", binding.endpoint);
    updates.set("COMWIT_STORAGE_BUCKET", binding.bucket);
    updates.set("COMWIT_STORAGE_PUBLIC_BASE_URL", binding.publicBaseUrl);
  }
  if (
    Object.hasOwn(payload, "COMWIT_STORAGE_PUBLIC_BASE_URL") &&
    providedStorageCore.length === 0
  ) {
    fail("Storage public URL requires all project Storage core keys");
  }

  if (Object.hasOwn(payload, "NODE_ENV")) {
    if (!new Set(["development", "test", "production"]).has(payload.NODE_ENV)) {
      fail("NODE_ENV has an unexpected value");
    }
    updates.set("NODE_ENV", payload.NODE_ENV);
  }
  if (Object.hasOwn(payload, "PORT")) {
    const port = Number(payload.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      fail("PORT must be an integer from 1 to 65535");
    }
    updates.set("PORT", String(port));
  }
  return updates;
}

function assertSafeValue(value, key) {
  if (typeof value !== "string" || /[\0\r\n]/.test(value)) {
    fail(`resource value is invalid: ${key}`);
  }
}

// The Comwit MCP `setup_database` / `setup_storage` / `list_cloud_resources`
// responses carry exactly one env group. Unlike the project snapshot, a group
// replaces only its own keys; a missing optional public URL removes the stale one.
function resourceUpdates(resource, payload) {
  const keys = resource === "database"
    ? ["COMWIT_DATABASE_ID", "DATABASE_URL"]
    : resource === "storage"
      ? ["COMWIT_STORAGE_ID", "COMWIT_STORAGE_ENDPOINT", "COMWIT_STORAGE_BUCKET"]
      : fail("unknown resource environment group");
  exactObject(
    payload,
    keys,
    resource === "storage" ? ["COMWIT_STORAGE_PUBLIC_BASE_URL"] : [],
    `${resource} environment`,
  );
  for (const key of keys) requiredString(payload[key], key);
  if (resource === "database") {
    return new Map([
      ["COMWIT_DATABASE_ID", payload.COMWIT_DATABASE_ID.trim()],
      ["DATABASE_URL", validateDatabaseUrl(payload.DATABASE_URL)],
    ]);
  }
  if (
    Object.hasOwn(payload, "COMWIT_STORAGE_PUBLIC_BASE_URL") &&
    payload.COMWIT_STORAGE_PUBLIC_BASE_URL !== null &&
    typeof payload.COMWIT_STORAGE_PUBLIC_BASE_URL !== "string"
  ) {
    fail("COMWIT_STORAGE_PUBLIC_BASE_URL must be a string or null");
  }
  const binding = validateStorageBinding({
    id: payload.COMWIT_STORAGE_ID,
    endpoint: payload.COMWIT_STORAGE_ENDPOINT,
    bucket: payload.COMWIT_STORAGE_BUCKET,
    publicBaseUrl: payload.COMWIT_STORAGE_PUBLIC_BASE_URL ?? null,
  });
  return new Map([
    ["COMWIT_STORAGE_ID", binding.id],
    ["COMWIT_STORAGE_ENDPOINT", binding.endpoint],
    ["COMWIT_STORAGE_BUCKET", binding.bucket],
    ["COMWIT_STORAGE_PUBLIC_BASE_URL", binding.publicBaseUrl],
  ]);
}

/**
 * Copies `.agents/scaffolds/<resource>/**` into the workspace, keeping files that
 * already exist. Runs after a database/storage env merge so DB/Storage code only
 * appears in `src/` once a real resource is connected (screens first, mock data).
 */
export function installScaffolds(resource, workspaceRoot = findWorkspaceRoot(process.cwd())) {
  const source = join(workspaceRoot, ".agents", "scaffolds", resource);
  if (!existsSync(source) || !statSync(source).isDirectory()) {
    fail(`scaffold directory is missing: .agents/scaffolds/${resource}`);
  }
  const created = [];
  const skipped = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const from = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(from);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = relative(source, from);
      const to = join(workspaceRoot, relativePath);
      if (existsSync(to)) {
        skipped.push(relativePath);
        continue;
      }
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
      created.push(relativePath);
    }
  };
  walk(source);
  return { created, skipped };
}

const SLOT_OPEN = /^<!--\s*comwit:slot\s+([a-z][a-z0-9-]*)\s*-->\s*$/;
const SLOT_CLOSE = /^<!--\s*\/comwit:slot\s*-->\s*$/;
const RESOURCE_CLOSE = /^<!--\s*\/comwit:resource\s*-->\s*$/;
const resourceOpen = (resource) =>
  new RegExp(`^<!--\\s*comwit:resource\\s+${resource}\\s+([a-z][a-z0-9-]*)\\s*-->\\s*$`);

function parseFragmentSlots(text) {
  const slots = new Map();
  let current = null;
  let body = [];
  for (const line of text.split(/\r?\n/)) {
    if (current === null) {
      const match = line.match(SLOT_OPEN);
      if (match) {
        current = match[1];
        body = [];
      }
      continue;
    }
    if (SLOT_CLOSE.test(line)) {
      slots.set(current, body.join("\n"));
      current = null;
      continue;
    }
    body.push(line);
  }
  if (current !== null) fail(`unterminated slot "${current}" in rules fragment`);
  return slots;
}

/**
 * Replaces every `<!-- comwit:resource <resource> <slot> -->` … `<!-- /comwit:resource -->`
 * block in the root `AGENTS.md` with the matching slot body from
 * `.agents/fragments/<resource>.md`. `CLAUDE.md` imports that file, so both
 * runtimes see the change. The rules file ships in its mock-data state;
 * connecting a resource is what switches the guidance, and the switch is
 * one-way. Returns "applied", "already" (no slots left), or "skipped"
 * (no rules file/fragment).
 */
export function applyRulesFragment(resource, workspaceRoot = findWorkspaceRoot(process.cwd())) {
  const rulesPath = join(workspaceRoot, "AGENTS.md");
  const fragmentPath = join(workspaceRoot, ".agents", "fragments", `${resource}.md`);
  if (!existsSync(rulesPath) || !existsSync(fragmentPath)) return "skipped";
  const rules = readFileSync(rulesPath, "utf8");
  const open = resourceOpen(resource);
  const lineEnding = rules.includes("\r\n") ? "\r\n" : "\n";
  const lines = rules.split(/\r?\n/);
  if (!lines.some((line) => open.test(line))) return "already";
  const slots = parseFragmentSlots(readFileSync(fragmentPath, "utf8"));
  const out = [];
  let current = null;
  for (const line of lines) {
    if (current !== null) {
      if (RESOURCE_CLOSE.test(line)) current = null;
      continue;
    }
    const match = line.match(open);
    if (!match) {
      out.push(line);
      continue;
    }
    current = match[1];
    if (!slots.has(current)) fail(`rules fragment for ${resource} has no slot "${current}"`);
    const body = slots.get(current);
    if (body !== "") out.push(...body.split("\n"));
  }
  if (current !== null) fail(`unterminated resource slot "${current}" in rules`);
  const mode = statSync(rulesPath).mode & 0o7777;
  atomicReplace(rulesPath, out.join(lineEnding), mode);
  return "applied";
}

function mergeEnv(source, updates) {
  const lineEnding = source.includes("\r\n") ? "\r\n" : "\n";
  const trailing = /\r?\n$/.test(source);
  const rows = source === "" ? [] : source.split(/\r?\n/);
  if (trailing) rows.pop();
  const indexes = new Map();
  for (let index = 0; index < rows.length; index += 1) {
    const match = rows[index].match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/,
    );
    if (!match || !updates.has(match[1])) continue;
    if (indexes.has(match[1])) {
      fail(`refusing ambiguous duplicate env key: ${match[1]}`);
    }
    indexes.set(match[1], index);
  }

  for (const [key, value] of updates) {
    if (value === null) {
      if (indexes.has(key)) rows[indexes.get(key)] = null;
      continue;
    }
    assertSafeValue(value, key);
    const row = `${key}=${value}`;
    if (indexes.has(key)) rows[indexes.get(key)] = row;
    else rows.push(row);
  }
  const next = rows.filter((row) => row !== null).join(lineEnding);
  return `${next}${trailing ? lineEnding : ""}`;
}

function atomicReplace(path, source, mode) {
  const temporary = join(
    dirname(path),
    `.${basename(path)}.comwit-${process.pid}-${randomUUID()}.tmp`,
  );
  let descriptor;
  try {
    descriptor = openSync(temporary, "wx", mode);
    writeFileSync(descriptor, source, { encoding: "utf8" });
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    chmodSync(temporary, mode);
    renameSync(temporary, path);
    if (process.platform !== "win32") {
      const directory = openSync(dirname(path), "r");
      try {
        fsyncSync(directory);
      } finally {
        closeSync(directory);
      }
    }
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Preserve the original failure.
      }
    }
    if (existsSync(temporary)) {
      try {
        unlinkSync(temporary);
      } catch {
        // Preserve the original failure.
      }
    }
  }
}

export function writeProjectEnvironment(payload, {
  workspaceRoot = findWorkspaceRoot(process.cwd()),
  envPath = join(workspaceRoot, ".env"),
  expectedSource,
  resource = "project",
} = {}) {
  const relativePath = relative(workspaceRoot, envPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    fail("the env merge target must stay inside the workspace");
  }
  let parent = dirname(resolve(envPath));
  while (parent !== resolve(workspaceRoot)) {
    if (lstatSync(parent).isSymbolicLink()) fail("env parent must not be a symlink");
    const next = dirname(parent);
    if (next === parent) fail("env target must stay inside the workspace");
    parent = next;
  }
  const actualRelative = relative(realpathSync(workspaceRoot), realpathSync(dirname(envPath)));
  if (actualRelative.startsWith("..") || isAbsolute(actualRelative)) {
    fail("env target must stay inside the workspace");
  }
  if (git(workspaceRoot, ["ls-files", "--error-unmatch", relativePath]).status === 0) {
    fail("refusing atomic merge because .env is tracked by Git");
  }
  if (git(workspaceRoot, ["check-ignore", "-q", relativePath]).status !== 0) {
    fail("refusing atomic merge because .env is not ignored by Git");
  }
  const updates = resource === "project" ? projectUpdates(payload) : resourceUpdates(resource, payload);
  let stat = null;
  try { stat = lstatSync(envPath); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (stat && (stat.isSymbolicLink() || !stat.isFile())) {
    fail("env file must be a regular, non-symlink file");
  }
  const original = stat ? readFileSync(envPath, "utf8") : "";
  if (expectedSource !== undefined && original !== expectedSource) {
    fail("local environment changed during the request; resolve again");
  }
  // Validate before replacing: a malformed response must never damage .env.
  parseEnv(original);
  const next = mergeEnv(original, updates);
  const verified = parseEnv(next);
  for (const [key, value] of updates) {
    if (value === null ? verified.has(key) : verified.get(key) !== value) {
      fail(`atomic env verification failed for key: ${key}`);
    }
  }
  if (!stat || next !== original) atomicReplace(envPath, next, stat ? stat.mode & 0o7777 : 0o600);
  return [...updates.keys()];
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    const keys = writeProjectEnvironment(await readStructuredInput(), {
      workspaceRoot,
      envPath: resolve(process.cwd(), options.envPath),
      resource: options.resource,
    });
    const scaffolds = options.resource === "project"
      ? { created: [], skipped: [] }
      : installScaffolds(options.resource, workspaceRoot);
    const rules = options.resource === "project" ? "skipped" : applyRulesFragment(options.resource, workspaceRoot);
    console.log(
      `RESOURCE_ENV_SYNC_OK resource=${options.resource} keys=${keys.join(",")} created=${scaffolds.created.join(",")} skipped=${scaffolds.skipped.join(",")} rules=${rules}`,
    );
    if (rules === "applied") {
      console.log("AGENTS.md / CLAUDE.md now carry the connected-state rules; re-read them before continuing.");
    }
  } catch (error) {
    // No source lines, raw payload, stack, or OS error paths in CLI diagnostics.
    console.error(error instanceof Error && !error.code ? error.message : "resource environment sync failed");
    process.exitCode = 1;
  }
}
