// Image resizing utility, installed by the Comwit MCP setup_storage response script.
// Resize on the client before uploading to reduce upload size, time, and storage costs.
// Store the resulting width/height in ImageAsset and pass them to <img>
// to prevent cumulative layout shift (CLS).
//
// Mobile-safe, including iOS Safari:
//   - Decode once with createImageBitmap, then draw to a scaled canvas, one image at a time.
//   - Use imageOrientation:'from-image' to respect EXIF rotation in phone photos.
//   - Encode as WebP, with JPEG fallback for unsupported browsers.
// Suitable for typical phone photos (up to 12–16 MP). See storage upload comments for usage.

/** Standard DB image-column shape. Use ImageAsset[] for multiple images. */
export type ImageAsset = {
  url: string
  width: number
  height: number
}

export type ResizeResult = {
  blob: Blob
  width: number
  height: number
}

export type ResizeOptions = {
  /** Maximum length of the longest edge in pixels (default: 1600). */
  maxEdge?: number
  /** Encoding quality from 0 to 1 (default: 0.8). */
  quality?: number
  /** Output format (default: WebP). */
  type?: "image/webp" | "image/jpeg"
}

/**
 * Resize an image so its longest edge is at most maxEdge, returning a Blob.
 * Save the returned width/height in an ImageAsset.
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
  const { maxEdge = 1600, quality = 0.8, type = "image/webp" } = options

  // Decode once, respecting EXIF orientation.
  const source = await createImageBitmap(file, { imageOrientation: "from-image" })
  const ratio = Math.min(1, maxEdge / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * ratio))
  const height = Math.max(1, Math.round(source.height * ratio))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    source.close()
    throw new Error("canvas 2d context 생성 실패")
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, 0, 0, width, height)
  source.close()

  const blob = await encode(canvas, type, quality)
  return { blob, width, height }
}

function encode(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) return resolve(blob)
        // Fall back to JPEG when the browser cannot encode WebP.
        if (type !== "image/jpeg") {
          canvas.toBlob(
            (jpeg) =>
              jpeg ? resolve(jpeg) : reject(new Error("이미지 인코딩 실패")),
            "image/jpeg",
            quality,
          )
        } else {
          reject(new Error("이미지 인코딩 실패"))
        }
      },
      type,
      quality,
    )
  })
}
