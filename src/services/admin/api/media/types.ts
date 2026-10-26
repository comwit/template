import type * as Types from "@/lib/commerce";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/commerce";
import type { ImageAsset } from "@/lib/image";
export type { ImageAsset } from "@/lib/image";
export type UploadTicket = {
  id: string;
  key: string;
  url: string;
  method: "GET" | "HEAD" | "PUT" | "DELETE";
  headers: Record<string, string>;
  expiresAt: string;
  publicUrl: string | null;
};
export interface AdminMediaAPI {
  prepare(contentType: string): Promise<UploadTicket>;
  /** `thumbId`: 먼저 완료한 썸네일 업로드 id. 넘기면 결과 ImageAsset 에 `thumb` 가 묶인다. */
  complete(
    id: string,
    width: number,
    height: number,
    thumbId?: string,
  ): Promise<ImageAsset>;
}
