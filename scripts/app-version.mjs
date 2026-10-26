import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// CI may supply an artifact ID. A commit hash alone does not identify a rebuild.
export function createAppVersion(env = process.env) {
  return env.NEXT_DEPLOYMENT_ID?.trim() || env.DEPLOYMENT_VERSION?.trim() || randomUUID();
}

export function readAppVersion({
  development = process.env.NODE_ENV !== "production",
  file = new URL("../public/version.json", import.meta.url),
} = {}) {
  if (development) return "development";
  const { version } = JSON.parse(readFileSync(file, "utf8"));
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Missing deployment version. Run pnpm build to generate the app and worker together.");
  }
  return version.trim();
}
