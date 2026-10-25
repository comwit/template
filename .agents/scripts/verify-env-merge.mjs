#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

function fail(message, exitCode = 1) {
  console.error(message);
  process.exit(exitCode);
}

function findWorkspaceRoot(startPath) {
  let current = path.resolve(startPath);
  while (true) {
    if (existsSync(path.join(current, ".agents"))) return current;
    const parent = path.dirname(current);
    if (parent === current) fail("Could not find a workspace containing .agents/");
    current = parent;
  }
}

function isInside(parentPath, childPath) {
  const relativePath = path.relative(parentPath, childPath);
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function evaluateEnvPath(workspaceRoot, requestedPath) {
  const lexicalEnv = path.resolve(process.cwd(), requestedPath);
  if (!isInside(workspaceRoot, lexicalEnv)) {
    fail("The env merge target must stay inside the workspace");
  }

  const relativePath = path.relative(workspaceRoot, lexicalEnv);
  const parentSegments = path.dirname(relativePath).split(path.sep).filter(Boolean);
  let current = workspaceRoot;
  for (const segment of parentSegments) {
    current = path.join(current, segment);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      fail("Env merge parent path must contain only regular directories");
    }
  }

  const realWorkspace = realpathSync(workspaceRoot);
  const realParent = realpathSync(path.dirname(lexicalEnv));
  if (!isInside(realWorkspace, realParent)) {
    fail("The evaluated env merge target must stay inside the workspace");
  }
  return {
    envFile: path.join(realParent, path.basename(lexicalEnv)),
    realWorkspace,
  };
}

function git(cwd, args) {
  return spawnSync("git", args, { cwd, stdio: "ignore" });
}

function readEnv(filePath) {
  if (!existsSync(filePath)) return new Map();
  const values = new Map();
  for (const row of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = row.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    values.set(
      line.slice(0, separator).trim(),
      line.slice(separator + 1).trim().replace(/^["']|["']$/g, ""),
    );
  }
  return values;
}

function parseArgs(args) {
  let envPath = ".env";
  const allowed = new Set();
  let index = 0;
  for (; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      index += 1;
      break;
    }
    if (arg === "--env" && args[index + 1]) {
      envPath = args[++index];
      continue;
    }
    if (arg === "--allow" && args[index + 1]) {
      for (const key of args[++index].split(",")) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(key)) fail(`Invalid allowed env key: ${key}`);
        allowed.add(key);
      }
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }

  const command = args[index];
  if (!command) {
    fail(
      "Usage: verify-env-merge.mjs [--env .env] [--allow KEY[,KEY...]] -- <command> [args...]",
    );
  }
  return { envPath, allowed, command, commandArgs: args.slice(index + 1) };
}

const parsed = parseArgs(process.argv.slice(2));
const workspaceRoot = findWorkspaceRoot(process.cwd());
const { envFile, realWorkspace } = evaluateEnvPath(
  workspaceRoot,
  parsed.envPath,
);
let initialStat;
try {
  initialStat = lstatSync(envFile);
} catch (error) {
  if (error?.code === "ENOENT") fail("Env merge target must already exist");
  throw error;
}
if (initialStat.isSymbolicLink() || !initialStat.isFile()) {
  fail("Env merge target must be a regular, non-symlink file");
}
const relativeEnv = path.relative(realWorkspace, envFile);
if (git(realWorkspace, ["ls-files", "--error-unmatch", relativeEnv]).status === 0) {
  fail("Refusing env merge because the target is tracked by Git");
}
if (git(realWorkspace, ["check-ignore", "-q", relativeEnv]).status !== 0) {
  fail("Refusing env merge because the target is not ignored by Git");
}

if (
  process.platform === "win32" &&
  [parsed.command, ...parsed.commandArgs].some((value) =>
    /[&|<>^%!()"\r\n]/.test(value),
  )
) {
  fail("Unsafe Windows shell metacharacter in env merge command");
}

const before = readEnv(envFile);
const originalBytes = readFileSync(envFile);
const originalMode = initialStat.mode & 0o777;

function restoreOriginal() {
  const restorePath = `${envFile}.restore-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(restorePath, originalBytes, { mode: originalMode });
    renameSync(restorePath, envFile);
  } finally {
    rmSync(restorePath, { force: true });
  }
}

function rejectAndRestore(message, exitCode = 1) {
  try {
    restoreOriginal();
  } catch (error) {
    fail(`Env merge violation and exact restore failed: ${error.message}`);
  }
  fail(message, exitCode);
}

const result = spawnSync(parsed.command, parsed.commandArgs, {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) {
  rejectAndRestore(`Could not run env merge command: ${result.error.message}`);
}

let after;
try {
  const afterStat = lstatSync(envFile);
  if (afterStat.isSymbolicLink() || !afterStat.isFile()) {
    throw new Error("env target stopped being a regular non-symlink file");
  }
  after = readEnv(envFile);
} catch (error) {
  rejectAndRestore(`Could not inspect env after merge: ${error.message}`);
}
const violations = [];
for (const [key, value] of before) {
  if (!after.has(key)) {
    violations.push(`Env merge removed an existing key: ${key}`);
    continue;
  }
  if (!parsed.allowed.has(key) && after.get(key) !== value) {
    violations.push(`Env merge changed an unrelated existing key: ${key}`);
  }
}
for (const key of after.keys()) {
  if (!before.has(key) && !parsed.allowed.has(key)) {
    violations.push(`Env merge added an unrelated key: ${key}`);
  }
}

if (violations.length > 0) rejectAndRestore(violations.join("; "));

if (result.status !== 0) {
  rejectAndRestore(
    `Env merge command failed; exact original env was restored (${result.status})`,
    result.status ?? 1,
  );
}

console.log(`ENV_MERGE_PRESERVED ${before.size} EXISTING_KEYS`);
