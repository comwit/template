// The project's type check, run by `validate` and by `build` before `next build`.
// next.config turns off Next's own check (typescript.ignoreBuildErrors) so the
// build never type checks inside its own heap; this script stops the build instead.
//
// 1. `next typegen` writes next-env.d.ts and .next/types (route types and the
//    page/layout validator), so a clean checkout is checked like `next build` would.
// 2. `tsc --noEmit` in its own process. Its heap limit defaults to 4096 MB, above
//    Node's default on small build machines; override with
//    TYPECHECK_MAX_OLD_SPACE_SIZE=<MB> (it takes precedence over NODE_OPTIONS).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const run = (args) => {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// next.config reads the deployment version; `build` has written it already (sw:build).
if (!existsSync(new URL("../public/version.json", import.meta.url))) {
  run([fileURLToPath(new URL("./write-version.mjs", import.meta.url))]);
}

run([require.resolve("next/dist/bin/next"), "typegen"]);

const heapMb = Number(process.env.TYPECHECK_MAX_OLD_SPACE_SIZE ?? 4096);
if (!Number.isInteger(heapMb) || heapMb <= 0) {
  console.error("TYPECHECK_MAX_OLD_SPACE_SIZE must be a positive integer (MB).");
  process.exit(1);
}
run([`--max-old-space-size=${heapMb}`, require.resolve("typescript/bin/tsc"), "--noEmit"]);
