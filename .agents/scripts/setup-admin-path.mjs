import { randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "./project-env.mjs";

const key = "NEXT_PUBLIC_ADMIN_BASE_PATH";
function normalize(value) {
  let result = value.trim();
  if (!result.startsWith("/")) result = "/" + result;
  result = result.replace(/\/+$/, "");
  if (
    !result ||
    /[\s?#%\\]/u.test(result) ||
    result.includes("//") ||
    result.split("/").some((part) => part === "." || part === "..")
  )
    throw new Error(
      "Use a local path such as /운영실, without a query, fragment or encoded characters",
    );
  if (["admin", "api", "_next"].includes(result.split("/")[1]))
    throw new Error("Choose a path outside /admin, /api and /_next");
  return result;
}
function pagePaths(root) {
  const base = join(root, "src/app");
  if (!existsSync(base)) return [];
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name))
        : entry.name === "page.tsx"
          ? [join(dir, entry.name)]
          : [],
    );
  return walk(base)
    .map(
      (file) =>
        "/" +
        relative(base, file)
          .replace(/\/page\.tsx$/, "")
          .split("/")
          .filter((part) => !/^\([^)]*\)$/.test(part))
          .map((part) => part.replace(/^\(\.\)/, ""))
          .join("/"),
    )
    .filter((path) => path !== "/" && !path.startsWith("/admin"));
}
export function configureAdminPath(
  root,
  {
    requestedPath,
    environmentValue,
    random = () => randomBytes(5).toString("hex"),
  } = {},
) {
  const file = join(root, ".env");
  if (
    !existsSync(file) ||
    lstatSync(file).isSymbolicLink() ||
    !lstatSync(file).isFile()
  )
    throw new Error(
      "Prepare a regular project .env before initializing the admin path",
    );
  const original = readFileSync(file, "utf8");
  const matches = [
    ...original.matchAll(/^\s*(?:export\s+)?NEXT_PUBLIC_ADMIN_BASE_PATH\s*=/gm),
  ];
  if (matches.length > 1)
    throw new Error(
      "Remove duplicate NEXT_PUBLIC_ADMIN_BASE_PATH entries first",
    );
  const local = parseEnv(original).get(key)?.trim();
  const external = environmentValue?.trim();
  if (
    external &&
    requestedPath &&
    normalize(external) !== normalize(requestedPath)
  )
    throw new Error(
      "Update the injected NEXT_PUBLIC_ADMIN_BASE_PATH before changing the local value",
    );
  let value = requestedPath
    ? normalize(requestedPath)
    : external
      ? normalize(external)
      : local && local !== "/관리자"
        ? normalize(local)
        : `/관리자-${random()}`;
  value = normalize(value);
  if (
    pagePaths(root).some(
      (path) =>
        value === path ||
        value.startsWith(path + "/") ||
        path.startsWith(value + "/"),
    )
  )
    throw new Error("This admin path overlaps an existing storefront route");
  if (external) return { path: value, changed: false, source: "environment" };
  if (local === value) return { path: value, changed: false, source: "local" };
  const line = `${key}=${JSON.stringify(value)}`;
  const updated = matches.length
    ? original.replace(
        /^[ \t]*(?:export[ \t]+)?NEXT_PUBLIC_ADMIN_BASE_PATH[ \t]*=.*$/m,
        line,
      )
    : original + (original.endsWith("\n") ? "" : "\n") + line + "\n";
  writeFileSync(file, updated);
  return { path: value, changed: true, source: "local" };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== "--path"))
      throw new Error(
        "Usage: node .agents/scripts/setup-admin-path.mjs [--path /운영실]",
      );
    const result = configureAdminPath(
      fileURLToPath(new URL("../../", import.meta.url)),
      { requestedPath: args[1], environmentValue: process.env[key] },
    );
    console.log(result.path);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
