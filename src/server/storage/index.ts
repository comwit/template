import "server-only";

// Comwit Storage 접근은 Cloud presign API 하나로 끝낸다. S3 SDK는 쓰지 않는다.
// 브라우저는 서버가 발급한 presigned URL로 직접 PUT/GET 하고, 서버가 객체를
// 지워야 할 때도 presigned DELETE URL을 받아 fetch 한다.
const COMWIT_CLOUD_API = "https://api.cloud.comwit.io" as const;

export type PresignedObjectRequest = {
  url: string;
  method: "GET" | "HEAD" | "PUT" | "DELETE";
  headers: Record<string, string>;
  expiresAt: string;
};

type PresignOperation =
  "get_object" | "head_object" | "put_object" | "delete_object";

function requireStorageEnv(
  key: "COMWIT_PROJECT" | "COMWIT_STORAGE_ID" | "COMWIT_CLOUD_TOKEN",
): string {
  const value = process.env[key]?.trim();
  if (!value)
    throw new Error(`Required Storage environment is missing: ${key}`);
  return value;
}

// ── Presigned URL (클라이언트 직접 업로드용) ──
//
// 클라이언트 업로드 규약 (반드시 지킬 것):
//   1) 업로드 전 resizeImage() 로 축소한다 — 원본을 그대로 올리지 말 것.
//      (src/lib/image.ts · 함께 설치됨. 모바일 안전 · 용량/저장비용 절감)
//      강의 썸네일·배너 이미지는 resizeImageVariants() 로 본 이미지 + 480px 썸네일을 함께 만들고,
//      media_assets 경유(operationsRepository.prepareUpload/completeUpload)로 thumb 를 묶는다 — page.ai.md "이미지 업로드".
//   2) presign → PUT → 리사이즈 결과를 ImageAsset 로 저장한다.
//      (DB image 칼럼 = JSON.stringify(ImageAsset). repository 규약 참고)
//   서버 시드는 scripts/seed/images.ts(sharp) 가 같은 규격으로 만든다.
//
//   import { resizeImage, type ImageAsset } from "@/lib/image"
//
//   const { blob, width, height } = await resizeImage(file)         // 긴 변 1600px, webp
//   const ext = blob.type === "image/webp" ? "webp" : "jpg"
//   const signed = await createPresignedUploadUrl(`image.${ext}`, blob.type, "posts")
//   await fetch(signed.url, { method: signed.method, headers: signed.headers, body: blob })
//   if (!signed.publicUrl) throw new Error("Public Storage is required for ImageAsset URLs")
//   const image: ImageAsset = { url: signed.publicUrl, width, height } // ← 이걸 저장

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
  const publicBaseUrl =
    process.env.COMWIT_STORAGE_PUBLIC_BASE_URL?.trim() || null;

  return {
    key,
    publicUrl: publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, "")}/${encodeObjectKey(key)}`
      : null,
    ...signed,
  };
}

/** 객체 존재·크기 확인용 presigned HEAD. 큰 파일 업로드 완료 검증에 쓴다(본문을 내려받지 않는다). */
export async function createPresignedHeadUrl(
  key: string,
): Promise<PresignedObjectRequest> {
  return requestPresignedObject({ operation: "head_object", key });
}

export async function createPresignedDownloadUrl(
  key: string,
): Promise<PresignedObjectRequest> {
  return requestPresignedObject({ operation: "get_object", key });
}

/** 서버에서 객체를 지운다. presigned DELETE URL을 받아 그대로 실행한다. */
export async function deleteObject(key: string): Promise<void> {
  const signed = await requestPresignedObject({
    operation: "delete_object",
    key,
  });
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
    throw new Error(
      `Comwit Storage presign request failed (${response.status})`,
    );
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
