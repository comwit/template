import type * as Types from "@/lib/course";
import type { ImageAsset } from "@/lib/image";
export type * from "@/lib/course";
export interface AdminMediaAPI {
  prepare(contentType: string, folder: Types.UploadFolder): Promise<Types.UploadTicket>;
  complete(id: string, width: number, height: number, thumbId?: string): Promise<ImageAsset>;
}
