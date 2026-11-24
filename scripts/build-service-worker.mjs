import { build } from "esbuild";
import { readAppVersion } from "./app-version.mjs";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = join(import.meta.dirname, "..");
const appVersion = readAppVersion({ development: false });

// Precache revisions follow file contents, so an unchanged favicon is not downloaded again.
function fileRevision(candidates, fallback) {
  const file = candidates.map((path) => join(rootDir, path)).find((path) => existsSync(path));
  if (!file) return fallback;
  return createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
}
const faviconRevision = fileRevision(["src/app/favicon.ico", "public/favicon.ico"], appVersion);

await build({
  entryPoints: [join(rootDir, "src", "app", "sw.ts")],
  outfile: join(rootDir, "public", "sw.js"),
  bundle: true,
  minify: true,
  legalComments: "none",
  format: "iife",
  platform: "browser",
  target: ["chrome96", "firefox102", "safari15.4"],
  define: {
    __COMWIT_APP_VERSION__: JSON.stringify(appVersion),
    __COMWIT_FAVICON_REVISION__: JSON.stringify(faviconRevision),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

console.log(`built public/sw.js with Serwist (${appVersion})`);
