"use client";
import { useAdminBanners } from "@/services/admin/state/banners";
import { QueryMessage } from "@/services/admin/_components/course";
import { BannersSection } from "./banners-section";
import { BannerEditor } from "./banner-editor";
import { BannerImage } from "./banner-image";
export function BannersContent() {
  const banners = useAdminBanners((s) => ({
    list: s.list.load(),
    draft: s.draft,
    editorOpen: s.editorOpen,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  return (
    <>
      <QueryMessage
        isError={banners.list.isError}
        isLoading={banners.list.isLoading}
        error={banners.list.error}
        onRetry={() => void banners.actions.refresh()}
      >
        <BannersSection
          banners={banners.list.data}
          busy={banners.busy}
          onRefresh={() => void banners.actions.refresh()}
          onCreate={banners.actions.openNew}
          onEdit={banners.actions.edit}
          onToggle={(b) => void banners.actions.toggleActive(b)}
          onRemove={(id) => void banners.actions.remove(id)}
        />
      </QueryMessage>
      <BannerEditor
        key={banners.draft.id ?? "new"}
        open={banners.editorOpen}
        draft={banners.draft}
        busy={banners.busy}
        error={banners.error}
        onChange={banners.actions.setDraft}
        onSave={() => void banners.actions.save()}
        onClose={banners.actions.close}
        image={<BannerImage />}
      />
    </>
  );
}
