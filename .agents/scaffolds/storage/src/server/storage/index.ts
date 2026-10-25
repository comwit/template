import "server-only";

// Access Comwit Storage through the Cloud presign API; do not use an S3 SDK.
// Browsers PUT/GET directly through server-issued presigned URLs. Server-side
// deletion also obtains a presigned DELETE URL and fetches it.
const COMWIT_CLOUD_API = "https://api.cloud.comwit.io" as const;

export type PresignedObjectRequest = {
  url: string;
  method: "GET" | "HEAD" | "PUT" | "DELETE";
  headers: Record<string, string>;
  expiresAt: string;
};

type PresignOperation =
  | "get_object"
  | "head_object"
  | "put_object"
  | "delete_object";

function requireStorageEnv(
  key: "COMWIT_PROJECT" | "COMWIT_STORAGE_ID" | "COMWIT_CLOUD_TOKEN",
): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Required Storage environment is missing: ${key}`);
  return value;
}

// Presigned URLs for direct client uploads.
//
// Required client upload flow:
//   1) Resize with resizeImage() before uploading; never upload the original unchanged.
//      (src/lib/image.ts is installed alongside this; mobile-safe and saves storage.)
//   2) Presign → PUT → save the resized result as an ImageAsset.
//      (DB image column = JSON.stringify(ImageAsset); see repository conventions.)
//
//   import { resizeImage, type ImageAsset } from "@/lib/image"
//
//   const { blob, width, height } = await resizeImage(file) // 1600px longest edge, WebP
//   const ext = blob.type === "image/webp" ? "webp" : "jpg"
//   const signed = await createPresignedUploadUrl(`image.${ext}`, blob.type, "posts")
//   await fetch(signed.url, { method: signed.method, headers: signed.headers, body: blob })
//   if (!signed.publicUrl) throw new Error("Public Storage is required for ImageAsset URLs")
//   const image: ImageAsset = { url: signed.publicUrl, width, height } // Save this.

export async function createPresignedUploadUrl(
  fileName: string,
  contentType: string,
  path: string = "uploads",
): Promise<PresignedObjectRequest & { key: string; publicUrl: string | null }> {
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "bin";
  const key = `${path}/${crypto.randomUUID()}.${fileExtension}`;
  const signed = await requestPresignedObject({
    operation: "put_object",
    key,
    contentType,
  });
  const publicBaseUrl = process.env.COMWIT_STORAGE_PUBLIC_BASE_URL?.trim() || null;

  return {
    key,
    publicUrl: publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, "")}/${encodeObjectKey(key)}`
      : null,
    ...signed,
  };
}

export async function createPresignedDownloadUrl(
  key: string,
): Promise<PresignedObjectRequest> {
  return requestPresignedObject({ operation: "get_object", key });
}

/** Delete an object on the server by fetching its presigned DELETE URL. */
export async function deleteObject(key: string): Promise<void> {
  const signed = await requestPresignedObject({ operation: "delete_object", key });
  const response = await fetch(signed.url, {
    method: signed.method,
    headers: signed.headers,
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Comwit Storage delete failed (${response.status})`);
  }
}

async function requestPresignedObject(input: {
  operation: PresignOperation;
  key: string;
  contentType?: string;
}): Promise<PresignedObjectRequest> {
  const projectId = requireStorageEnv("COMWIT_PROJECT");
  const storageId = requireStorageEnv("COMWIT_STORAGE_ID");
  const cloudToken = requireStorageEnv("COMWIT_CLOUD_TOKEN");
  const response = await fetch(
    `${COMWIT_CLOUD_API}/v1/projects/${encodeURIComponent(projectId)}/storages/${encodeURIComponent(storageId)}/presigned-urls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operation: input.operation,
        key: input.key,
        expires_in_seconds: 900,
        ...(input.contentType ? { content_type: input.contentType } : {}),
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Comwit Storage presign request failed (${response.status})`);
  }

  const payload = (await response.json()) as Partial<{
    url: string;
    method: PresignedObjectRequest["method"];
    headers: Record<string, string>;
    expires_at: string;
  }>;
  if (
    !payload.url ||
    !payload.method ||
    !["GET", "HEAD", "PUT", "DELETE"].includes(payload.method) ||
    !payload.headers ||
    Array.isArray(payload.headers) ||
    !payload.expires_at
  ) {
    throw new Error("Comwit Storage returned an invalid presign response");
  }

  const headerEntries = Object.entries(payload.headers);
  const encodedToken = encodeURIComponent(cloudToken);
  if (
    payload.url.includes(cloudToken) ||
    payload.url.includes(encodedToken) ||
    headerEntries.some(
      ([key, value]) =>
        key.toLowerCase() === "authorization" || value.includes(cloudToken),
    )
  ) {
    throw new Error("Comwit Storage returned an unsafe presign response");
  }
  return {
    url: payload.url,
    method: payload.method,
    headers: payload.headers,
    expiresAt: payload.expires_at,
  };
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}
