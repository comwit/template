import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const require = createRequire(import.meta.url);
// 서버 전용 스크립트 레지스트리. 파생 프로젝트는 여기에 `seed:catalog`(scripts/seed/catalog.ts) 를 등록한다.
const scripts = { "admin:create": "scripts/provision-admin.ts" };
const name = process.argv[2];
const entry = scripts[name];
if (!entry) throw new Error("Unknown server script");
mkdirSync(".agents/state/runners", { recursive: true });
const outfile = `.agents/state/runners/${name.replace(":", "-")}.mjs`;
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  alias: {
    "server-only": require.resolve("next/dist/compiled/server-only/empty.js"),
    "next/server": require.resolve("next/server"),
    "next/headers": require.resolve("next/headers"),
  },
});
const result = spawnSync(process.execPath, ["--env-file=.env", outfile], {
  stdio: "inherit",
});
process.exitCode = result.status ?? 1;
