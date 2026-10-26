import {
  existsSync,
  readFileSync,
  writeFileSync,
  lstatSync,
  realpathSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { resolve, relative, join, sep } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const skillPath = ".agents/skills/shop-setup";
const checks = ["validate", "test", "agents:test", "storybook:build"];
const ignored = new Set([
  ".git",
  "node_modules",
  ".next",
  ".next-dev",
  "dist",
  "storybook-static",
  "coverage",
  ".records",
  ".pnpm-store",
]);
function inside(root, name) {
  if (
    typeof name !== "string" ||
    !name ||
    name.includes("\\") ||
    name.startsWith("/") ||
    name.split("/").includes("..")
  )
    throw new Error("Artifact path must stay inside the project");
  const path = resolve(root, name);
  if (!realpathSync(path).startsWith(root + sep))
    throw new Error("Artifact resolves outside the project");
  return path;
}
function regularDirectory(root, name) {
  let dir = root;
  for (const part of name.split("/")) {
    dir = join(dir, part);
    if (
      existsSync(dir) &&
      (lstatSync(dir).isSymbolicLink() || !lstatSync(dir).isDirectory())
    )
      throw new Error("Cleanup directory must not be a symlink: " + name);
  }
  return dir;
}
function references(root) {
  const matches = [];
  const scan = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const path = join(dir, entry.name),
        rel = relative(root, path).replaceAll("\\", "/");
      if (
        rel === skillPath ||
        rel.startsWith(skillPath + "/") ||
        rel === ".claude/skills/shop-setup" ||
        rel.startsWith(".claude/skills/shop-setup/") ||
        rel === ".agents/state" ||
        rel === ".agents/tests/shop-setup.test.mjs" ||
        rel === ".agents/scripts/cleanup-skill.mjs" ||
        rel === "PUBLIC_SOURCE.json"
      )
        continue;
      if (entry.isDirectory()) scan(path);
      else if (
        entry.isFile() &&
        /\.(tsx?|jsx?|mjs|cjs|css|scss|html|mdx?|json|ya?ml|toml)$/.test(
          entry.name,
        )
      ) {
        const text = readFileSync(path, "utf8");
        if (
          text.includes(skillPath) ||
          /shop-setup\/(assets|references|scripts)\//.test(text)
        )
          matches.push(rel);
      }
    }
  };
  scan(root);
  return matches;
}
export function completeShop({
  root,
  run = (name) =>
    spawnSync("pnpm", ["run", name], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
    }),
}) {
  root = realpathSync(root);
  let remotes = "";
  try {
    remotes = execFileSync("git", ["-C", root, "remote", "-v"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {}
  if (/comwit[/:]template(?:-shop)?(?:\.git)?(?:\s|$)/i.test(remotes))
    throw new Error(
      "Refusing cleanup in the maintained template source repository",
    );
  const skill = regularDirectory(root, skillPath),
    stub = regularDirectory(root, ".claude/skills/shop-setup");
  const stateDir = regularDirectory(root, ".agents/state");
  const stateFile = join(stateDir, "shop-setup.json");
  if (!existsSync(stateFile) || lstatSync(stateFile).isSymbolicLink())
    throw new Error("Missing regular setup progress file");
  const state = JSON.parse(readFileSync(stateFile, "utf8"));
  if (state.status === "complete" && !existsSync(skill) && !existsSync(stub))
    return { status: "already-complete" };
  if (
    state.status !== "ready" ||
    !state.brand?.trim() ||
    state.visualReview !== true
  )
    throw new Error(
      "Setup is not ready: finish the requested pages and visual review",
    );
  for (const resource of ["database", "storage"])
    if (
      !["connected", "deferred-by-user"].includes(state.resources?.[resource])
    )
      throw new Error("Unfinished resource: " + resource);
  const artifacts = [];
  for (const kind of ["pages", "stories"]) {
    if (!Array.isArray(state[kind]) || !state[kind].length)
      throw new Error("Missing " + kind + " artifacts");
    for (const name of state[kind]) {
      if (
        kind === "pages"
          ? !/^src\/(services\/[^/]+\/page|app)\/.+\.(tsx|ts)$/.test(name)
          : !/^src\/stories\/.+\.stories\.(tsx|ts)$/.test(name)
      )
        throw new Error("Unexpected " + kind + " artifact path");
      const file = inside(root, name);
      if (!lstatSync(file).isFile() || !readFileSync(file).length)
        throw new Error("Empty or missing artifact: " + name);
      artifacts.push(name);
    }
  }
  for (const name of checks) {
    const result = run(name);
    if (result.error || result.status !== 0)
      throw new Error(
        "Validation failed: " +
          name +
          "; keep the skill and resume after fixing it",
      );
  }
  const referenced = references(root);
  if (referenced.length)
    throw new Error(
      "Move used assets/imports to persistent paths before cleanup: " +
        referenced.join(", "),
    );
  // No deletion occurs until every required check and reference scan succeeds.
  // Recheck targets after subprocesses so a changed/symlinked target cannot escape.
  regularDirectory(root, skillPath);
  regularDirectory(root, ".claude/skills/shop-setup");
  regularDirectory(root, ".agents/state");
  const evidence = Object.fromEntries(
    artifacts.map((name) => [
      name,
      createHash("sha256")
        .update(readFileSync(inside(root, name)))
        .digest("hex"),
    ]),
  );
  rmSync(skill, { recursive: true, force: true });
  rmSync(stub, { recursive: true, force: true });
  writeFileSync(
    stateFile,
    JSON.stringify(
      { ...state, status: "complete", checks, artifacts: evidence },
      null,
      2,
    ) + "\n",
  );
  return {
    status: "complete",
    removed: [skillPath, ".claude/skills/shop-setup"],
  };
}
