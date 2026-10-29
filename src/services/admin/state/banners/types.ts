import type { Query } from "@comwit/state";
import type { BannerInput, BannerView } from "@/lib/course";
import type { ImageAsset } from "@/lib/image";
export type * from "@/lib/course";
/** 편집 중에는 이미지가 아직 없을 수 있다. 저장 시 필수로 검사한다. */
export type BannerDraft = Omit<BannerInput, "image"> & {
  image: ImageAsset | null;
};
export type DomainState = {
  list: Query<BannerView[]>;
  draft: BannerDraft;
  editorOpen: boolean;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  refresh(): Promise<void>;
  openNew(): void;
  edit(banner: BannerView): void;
  close(): void;
  setDraft(draft: BannerDraft): void;
  setImage(image: ImageAsset | null): void;
  save(): Promise<void>;
  toggleActive(banner: BannerView): Promise<void>;
  remove(id: string): Promise<void>;
};
