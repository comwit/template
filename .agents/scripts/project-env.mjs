import { parseEnv as parseDotEnv } from "node:util";

export const RESOURCE_ENV_KEYS = [
  "COMWIT_API_TOKEN", "COMWIT_PAT", "COMWIT_PROJECT_ID", "USER_ID",
  "COMWIT_EXECUTION_ENV", "COMWIT_PROJECT", "COMWIT_APP", "COMWIT_CLOUD_TOKEN",
  "COMWIT_DATABASE_ID", "DATABASE_URL", "COMWIT_STORAGE_ID",
  "COMWIT_STORAGE_ENDPOINT", "COMWIT_STORAGE_BUCKET", "COMWIT_STORAGE_PUBLIC_BASE_URL",
];

export function parseEnv(source) {
  const seen = new Set();
  for (const match of source.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) {
    if (RESOURCE_ENV_KEYS.includes(match[1]) && seen.has(match[1])) {
      throw new Error("ambiguous duplicate resource environment key");
    }
    seen.add(match[1]);
  }
  return new Map(Object.entries(parseDotEnv(source)));
}

export function validateDatabaseUrl(value) {
  const candidate = value.trim();
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }
  if (
    !["https:", "libsql:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("DATABASE_URL must use https: or libsql: without credentials, query, or fragment");
  }
  return candidate;
}

function validatePublicBaseUrl(value) {
  const candidate = value.trim();
  if (!candidate) return null;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("COMWIT_STORAGE_PUBLIC_BASE_URL is not a valid URL");
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "COMWIT_STORAGE_PUBLIC_BASE_URL must be a public HTTPS URL",
    );
  }
  return candidate.replace(/\/+$/, "");
}

export function validateStorageBinding(input) {
  const id = String(input.id ?? "").trim();
  const endpoint = String(input.endpoint ?? "").trim().replace(/\/+$/, "");
  const bucket = String(input.bucket ?? "").trim();
  if (!id) throw new Error("COMWIT_STORAGE_ID is missing");
  if (!endpoint) throw new Error("COMWIT_STORAGE_ENDPOINT is missing");
  if (!bucket) throw new Error("COMWIT_STORAGE_BUCKET is missing");
  let endpointUrl;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error("COMWIT_STORAGE_ENDPOINT is not a valid URL");
  }
  if (
    endpointUrl.protocol !== "https:" ||
    !endpointUrl.hostname ||
    endpointUrl.username ||
    endpointUrl.password ||
    endpointUrl.search ||
    endpointUrl.hash
  ) {
    throw new Error("COMWIT_STORAGE_ENDPOINT must be a secure HTTPS endpoint");
  }
  return {
    id,
    endpoint,
    bucket,
    publicBaseUrl: validatePublicBaseUrl(
      input.publicBaseUrl === null || input.publicBaseUrl === undefined
        ? ""
        : String(input.publicBaseUrl),
    ),
  };
}
