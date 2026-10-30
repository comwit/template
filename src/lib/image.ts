// ── 이미지 리사이즈 유틸 (컴윗 MCP setup_storage 응답의 스크립트가 설치) ──────────────
// 파일 업로드 전 클라이언트에서 축소한다. 업로드 용량/시간과 Storage 저장비용이 줄고,
// 리사이즈 결과로 나온 width/height 를 그대로 ImageAsset 에 저장하면 <img> 에
// width/height 를 넘겨 레이아웃 시프트(CLS)도 막을 수 있다.
//
// 모바일(iOS Safari 포함) 안전:
//   - createImageBitmap 으로 한 번만 디코드 → 스케일 캔버스에 그림 (한 장씩 처리)
//   - imageOrientation:'from-image' 로 EXIF 회전 고정 (폰 사진 눕는 버그 방지)
//   - webp 로 인코딩, 미지원 브라우저는 jpeg 폴백
// 일반적인 폰 사진(≤12~16MP) 기준 안전하다. 사용법은 storage 업로드 코드 주석 참고.

import type { CSSProperties } from "react";

/**
 * DB image 칼럼에 저장하는 표준 형태. 여러 장은 ImageAsset[] 로.
 * `thumb` 는 같은 비율의 480px 썸네일 URL(선택). 목록·카드는 `image.thumb ?? image.url`, 상세·갤러리는 `url` 에
 * `style={thumbBackground(image)}` 를 함께 넘긴다 — 본 이미지가 올 때까지 목록에서 이미 받은 thumb 가 보인다.
 * width/height 는 본 이미지 기준이고 비율이 같으므로 썸네일 <img> 에도 그대로 넘긴다.
 */
export type ImageAsset = {
  url: string;
  width: number;
  height: number;
  thumb?: string;
};

/**
 * 상세처럼 큰 자리 `<img src={image.url}>` 의 style. 카드에서 이미 받은 `thumb` 를 배경으로 깔아,
 * 카드 → 상세 이동(시드) 때 본 이미지가 내려오기 전에도 썸네일이 바로 보인다.
 */
export function thumbBackground(image: ImageAsset): CSSProperties | undefined {
  if (!image.thumb) return undefined;
  return {
    backgroundImage: `url("${image.thumb}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

/** 본 이미지 긴 변(px). 서버 시드(scripts/seed/images.ts)와 같은 값. */
export const IMAGE_EDGE = 1600;
/** 썸네일 긴 변(px). 2배 밀도 기준으로 240px 카드까지 선명하다. */
export const THUMB_EDGE = 480;

export type ResizeResult = {
  blob: Blob;
  width: number;
  height: number;
};

export type ResizeOptions = {
  /** 긴 변 최대 픽셀 (기본 1600) */
  maxEdge?: number;
  /** 인코딩 품질 0~1 (기본 0.8) */
  quality?: number;
  /** 출력 포맷 (기본 webp) */
  type?: "image/webp" | "image/jpeg";
};

/**
 * 이미지 파일을 긴 변 maxEdge 이하로 축소해 Blob 으로 반환한다.
 * 반환된 width/height 로 ImageAsset 을 만들어 저장하면 된다.
 *
 * @example
 * const { blob, width, height } = await resizeImage(file)
 * const ext = blob.type === "image/webp" ? "webp" : "jpg"
 * const signed = await createPresignedUploadUrl(`image.${ext}`, blob.type, "posts")
 * await fetch(signed.url, { method: signed.method, headers: signed.headers, body: blob })
 * const { publicUrl } = signed
 * if (!publicUrl) throw new Error("Public Storage is required for ImageAsset URLs")
 * const image: ImageAsset = { url: publicUrl, width, height }
 */
export async function resizeImage(
  file: Blob,
  options: ResizeOptions = {},
): Promise<ResizeResult> {
  const { maxEdge = 1600, quality = 0.8, type = "image/webp" } = options;

  // EXIF orientation 을 반영해 한 번만 디코드
  const source = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const ratio = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * ratio));
  const height = Math.max(1, Math.round(source.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    source.close();
    throw new Error("canvas 2d context 생성 실패");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  source.close();

  const blob = await encode(canvas, type, quality);
  return { blob, width, height };
}

/**
 * 본 이미지(긴 변 1600) + 썸네일(긴 변 480)을 한 번에 만든다. 상품 이미지 업로드의 기본 경로.
 * 썸네일은 본 이미지 결과를 다시 줄여 만들므로 원본을 두 번 디코드하지 않는다.
 *
 * @example
 * const { full, thumb } = await resizeImageVariants(file)
 * // 썸네일 먼저 presign → PUT → complete, 본 이미지 complete 때 썸네일 업로드 id 를 넘겨 ImageAsset.thumb 로 묶는다.
 */
export async function resizeImageVariants(
  file: Blob,
  options: { maxEdge?: number; thumbEdge?: number; quality?: number } = {},
): Promise<{ full: ResizeResult; thumb: ResizeResult }> {
  const {
    maxEdge = IMAGE_EDGE,
    thumbEdge = THUMB_EDGE,
    quality = 0.8,
  } = options;
  const full = await resizeImage(file, { maxEdge, quality });
  const thumb = await resizeImage(full.blob, {
    maxEdge: thumbEdge,
    quality: 0.75,
    type: full.blob.type === "image/jpeg" ? "image/jpeg" : "image/webp",
  });
  return { full, thumb };
}

function encode(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) return resolve(blob);
        // webp 미지원 브라우저 → jpeg 폴백
        if (type !== "image/jpeg") {
          canvas.toBlob(
            (jpeg) =>
              jpeg ? resolve(jpeg) : reject(new Error("이미지 인코딩 실패")),
            "image/jpeg",
            quality,
          );
        } else {
          reject(new Error("이미지 인코딩 실패"));
        }
      },
      type,
      quality,
    );
  });
}

/** Storage data plane: browser PUT to an authenticated, short-lived upload URL. */
export async function uploadPresignedImage(
  ticket: { url: string; method: string; headers: Record<string, string> },
  blob: Blob,
): Promise<void> {
  if (ticket.method !== "PUT")
    throw new Error("올바른 업로드 요청이 아닙니다.");
  const response = await fetch(ticket.url, {
    method: "PUT",
    headers: ticket.headers,
    body: blob,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("이미지를 업로드하지 못했습니다.");
}
