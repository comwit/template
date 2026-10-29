import type * as Types from "@/lib/course";
export type * from "@/lib/course";
export interface AdminBannersAPI {
  findAll(): Promise<Types.BannerView[]>;
  save(request: Types.BannerInput): Promise<string>;
  remove(id: string): Promise<void>;
}
