---
name: video-offload
description: Move site-owned videos from public/ or source imports to Comwit Storage and manage their URLs in src/lib/assets.ts. Use for video uploads, large video files, video storage, deployment size limits, or externalizing videos.
---

# Video Offload

Site-owned videos stay out of Git and the app package. Only videos move —
fonts and design images (menu, banner, portrait…) stay local even when large,
unless the user separately asks. Never move generated JS/runtime files or
hand-edit build output to cut size.

## Steps

1. **Storage**: use the connected public Storage and the existing presign
   helper. If none is connected, call the Comwit MCP `setup_storage`
   (`public: true`). Never create an extra bucket just for videos.
2. **Upload route**: with the local dev server running, add a temporary
   dev-only route calling `createPresignedUploadUrl(...)` that returns 404 in
   production. Scope any lint exception to that one file.
3. **Upload**: PUT each video (from `public/` and `src/` imports) directly to
   its signed URL with exactly the returned headers — never through a server action.
4. **Verify**: public read, byte length, SHA-256 and Range responses. An upload
   success response alone is not proof.
5. **Wire**: put the public URLs in `src/lib/assets.ts` and import them
   everywhere the video was used. Add redirects for old published video URLs
   still referenced by clients or stored data.
6. **Clean up**: delete the originals, the temporary route and lint exception.
   Backups go only in an ignored private directory.
7. **Confirm**: `pnpm run validate`, `pnpm run build`, then check the package no
   longer bundles the videos.

User uploads (including images) keep using Storage + database URL fields, not
`assets.ts`. For a bucket migration: resumable bounded copy preserving keys and
metadata, verify inventory and checksums before switching URL bases, and remove
any temporary copy/debug endpoints afterwards.
