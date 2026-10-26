import { build } from "esbuild";
import { readAppVersion } from "./app-version.mjs";
import { join } from "node:path";

const rootDir = join(import.meta.dirname, "..");
const appVersion = readAppVersion({ development: false });

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
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

console.log(`built public/sw.js with Serwist (${appVersion})`);
