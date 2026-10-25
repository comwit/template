<!-- comwit:slot stack -->
**Storage**: Comwit Storage through the Cloud presign API only
(`src/server/storage/index.ts`); there is no S3 SDK. Browser uploads follow
`resizeImage` → `createPresignedUploadUrl` → PUT and store the resulting
`{ url, width, height }` as an `ImageAsset` (`src/lib/image.ts`).
<!-- /comwit:slot -->
<!-- comwit:slot structure -->
- `src/server/storage/` — presign client; `src/lib/image.ts` — `ImageAsset`
  type and `resizeImage` for browser uploads.
<!-- /comwit:slot -->
