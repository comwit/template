import { mkdirSync, writeFileSync } from "node:fs";
import { createAppVersion } from "./app-version.mjs";

const publicDir = new URL("../public/", import.meta.url);
const version = createAppVersion();
mkdirSync(publicDir, { recursive: true });
writeFileSync(new URL("version.json", publicDir), `${JSON.stringify({ version }, null, 2)}\n`);
console.log(`wrote public/version.json (${version})`);
