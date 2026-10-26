import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp, { type Sharp } from "sharp";
import { IMAGE_EDGE, THUMB_EDGE, type ImageAsset } from "../../src/lib/image";
import { operationsRepository } from "../../src/server/repository";
import { createPresignedUploadUrl } from "../../src/server/storage";

/**
 * 시드용 이미지 파이프라인 — 어드민 업로드(`resizeImageVariants`)와 같은 규격을 서버(sharp)에서 만든다.
 *   원본(Codex PNG 등) → 긴 변 1600px webp + 480px 썸네일 webp → Storage → `ImageAsset { url, width, height, thumb }`
 *
 * - 상품 이미지는 `uploadProductImage` — media_assets 를 거쳐야 상품 저장 검증을 통과한다.
 * - 캠페인·브랜드 이미지는 `uploadPublicImage` — 검증 대상이 아니라 presign 만으로 올린다.
 * - `uploadImageSet` 이 manifest JSON 으로 멱등 처리한다. 시드를 다시 돌려도 올린 파일은 건너뛴다.
 * `pnpm run-server-script`(esbuild, packages external) 로 실행되므로 sharp 는 평범하게 import 한다.
 */
export type ImageVariant = {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: "image/webp";
};

/** 이 용량을 넘으면 경고한다. 보통 사진은 원본 60~200KB, 썸네일 15~60KB 안에 든다. */
export const IMAGE_BUDGET = { full: 200 * 1024, thumb: 60 * 1024 } as const;

export type PrepareOptions = {
  maxEdge?: number;
  thumbEdge?: number;
  quality?: number;
  /** 경고 메시지에 쓸 이름(파일 경로 등) */
  label?: string;
};

async function encode(
  image: Sharp,
  edge: number,
  quality: number,
): Promise<ImageVariant> {
  const { data, info } = await image
    .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    width: info.width,
    height: info.height,
    contentType: "image/webp",
  };
}

/** 원본 파일(경로 또는 Buffer)을 본 이미지 + 썸네일 webp 로 만든다. EXIF 회전을 반영한다. */
export async function prepareImage(
  file: string | Buffer,
  options: PrepareOptions = {},
): Promise<{ full: ImageVariant; thumb: ImageVariant }> {
  const {
    maxEdge = IMAGE_EDGE,
    thumbEdge = THUMB_EDGE,
    quality = 80,
    label = typeof file === "string" ? file : "buffer",
  } = options;
  const input = typeof file === "string" ? readFileSync(file) : file;
  const full = await encode(sharp(input).rotate(), maxEdge, quality);
  const thumb = await encode(sharp(full.buffer), thumbEdge, 75);
  if (full.buffer.byteLength > IMAGE_BUDGET.full)
    console.warn(
      `[seed:images] ${label}: 본 이미지 ${Math.round(full.buffer.byteLength / 1024)}KB (기준 ${IMAGE_BUDGET.full / 1024}KB). 품질이나 크기를 낮추세요.`,
    );
  if (thumb.buffer.byteLength > IMAGE_BUDGET.thumb)
    console.warn(
      `[seed:images] ${label}: 썸네일 ${Math.round(thumb.buffer.byteLength / 1024)}KB (기준 ${IMAGE_BUDGET.thumb / 1024}KB).`,
    );
  return { full, thumb };
}

async function putObject(
  ticket: { url: string; method: string; headers: Record<string, string> },
  variant: ImageVariant,
) {
  const response = await fetch(ticket.url, {
    method: ticket.method,
    headers: ticket.headers,
    body: new Uint8Array(variant.buffer),
  });
  if (!response.ok) throw new Error(`이미지 업로드 실패 (${response.status})`);
}

/**
 * 상품 이미지. media_assets 에 pending → ready 로 기록되어야 `catalogRepository.save` 의 이미지 검증을 통과한다.
 * 썸네일을 먼저 완료하고 본 이미지 완료 때 그 id 를 넘겨 하나의 ImageAsset 으로 묶는다.
 */
export async function uploadProductImage(
  ownerId: string,
  file: string | Buffer,
  options?: PrepareOptions,
): Promise<ImageAsset> {
  const { full, thumb } = await prepareImage(file, options);
  const thumbTicket = await operationsRepository.prepareUpload(
    ownerId,
    thumb.contentType,
  );
  await putObject(thumbTicket, thumb);
  await operationsRepository.completeUpload(
    ownerId,
    thumbTicket.id,
    thumb.width,
    thumb.height,
  );
  const ticket = await operationsRepository.prepareUpload(
    ownerId,
    full.contentType,
  );
  await putObject(ticket, full);
  return operationsRepository.completeUpload(
    ownerId,
    ticket.id,
    full.width,
    full.height,
    thumbTicket.id,
  );
}

/** 캠페인·브랜드 이미지. 상품 검증 대상이 아니라 presign 만으로 `path/` 아래에 올린다. */
export async function uploadPublicImage(
  file: string | Buffer,
  path = "campaign",
  options?: PrepareOptions,
): Promise<ImageAsset> {
  const { full, thumb } = await prepareImage(file, options);
  const upload = async (variant: ImageVariant) => {
    const signed = await createPresignedUploadUrl(
      "image.webp",
      variant.contentType,
      path,
    );
    if (!signed.publicUrl)
      throw new Error("공개 Storage 가 있어야 이미지를 올릴 수 있습니다.");
    await putObject(signed, variant);
    return signed.publicUrl;
  };
  const thumbUrl = await upload(thumb);
  const url = await upload(full);
  return { url, width: full.width, height: full.height, thumb: thumbUrl };
}

/**
 * 멱등 업로드. `files` 의 키(예: `ruby-beet-1`)별로 manifest JSON 에 결과를 남기고, 있는 키는 건너뛴다.
 * 시드 스크립트가 상품 슬러그로 키를 만들어 `images[slug-1]`, `images[slug-2]` 처럼 꺼내 쓴다.
 */
export async function uploadImageSet(
  files: Record<string, string>,
  manifestPath: string,
  upload: (file: string) => Promise<ImageAsset>,
): Promise<Record<string, ImageAsset>> {
  const manifest: Record<string, ImageAsset> = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};
  for (const [key, file] of Object.entries(files)) {
    if (manifest[key]) continue;
    manifest[key] = await upload(file);
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
  return manifest;
}
