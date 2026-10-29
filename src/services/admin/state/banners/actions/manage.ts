import { action } from "@comwit/state";
import { adminBanners as api } from "@/services/admin/api/banners";
import { mutate } from "@/lib/course-state";
import { popup } from "@/lib/popup";
import type { BannerView } from "@/lib/course";
import type { ImageAsset } from "@/lib/image";
import type { BannerDraft, DomainActions } from "../types";
import { domain, freshDraft } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class ManageActions {
    private model = state(domain);
    async refresh() {
      await this.model.list.refetch();
    }
    openNew() {
      this.model.draft = freshDraft();
      this.model.error = null;
      this.model.editorOpen = true;
    }
    edit(banner: BannerView) {
      this.model.draft = {
        id: banner.id,
        title: banner.title,
        image: banner.image,
        linkUrl: banner.linkUrl,
        position: banner.position,
        active: banner.active,
        startsAt: banner.startsAt,
        endsAt: banner.endsAt,
      };
      this.model.error = null;
      this.model.editorOpen = true;
    }
    close() {
      if (!this.model.isSaving) this.model.editorOpen = false;
    }
    setDraft(draft: BannerDraft) {
      this.model.draft = draft;
    }
    setImage(image: ImageAsset | null) {
      this.model.draft.image = image;
    }
    async save() {
      const image = this.model.draft.image;
      if (!image) {
        this.model.error = "배너 이미지를 업로드해주세요.";
        return;
      }
      await mutate(
        this.model,
        async () => {
          await api.save({ ...this.model.draft, image });
          this.model.editorOpen = false;
          await this.refresh();
        },
        "배너를 저장했습니다.",
      );
    }
    async toggleActive(banner: BannerView) {
      await mutate(
        this.model,
        async () => {
          await api.save({
            id: banner.id,
            title: banner.title,
            image: banner.image,
            linkUrl: banner.linkUrl,
            position: banner.position,
            active: !banner.active,
            startsAt: banner.startsAt,
            endsAt: banner.endsAt,
          });
          await this.refresh();
        },
        banner.active ? "배너를 숨겼습니다." : "배너를 노출합니다.",
      );
    }
    async remove(id: string) {
      if (
        !(await popup.confirm({
          title: "배너를 삭제할까요?",
          description: "삭제한 배너는 되돌릴 수 없습니다.",
          destructive: true,
        }))
      )
        return;
      await mutate(
        this.model,
        async () => {
          await api.remove(id);
          await this.refresh();
        },
        "배너를 삭제했습니다.",
      );
    }
  }
  return new ManageActions();
});
