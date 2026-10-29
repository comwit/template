"use client";
import { useAdminNotices } from "@/services/admin/state/notices";
import { NoticesSection } from "./notices-section";
import { NoticeEditor } from "./notice-editor";
export function NoticesContent() {
  const notices = useAdminNotices((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    filter: s.filter,
    draft: s.draft,
    editorOpen: s.editorOpen,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  return (
    <>
      <NoticesSection
        query={notices.list}
        filter={notices.filter}
        busy={notices.busy}
        onFilter={notices.actions.setFilter}
        onPage={notices.actions.setPage}
        onRefresh={() => void notices.actions.refresh()}
        onCreate={notices.actions.openNew}
        onEdit={(id) => void notices.actions.edit(id)}
        onRemove={(id) => void notices.actions.remove(id)}
      />
      <NoticeEditor
        key={notices.draft.id ?? "new"}
        open={notices.editorOpen}
        draft={notices.draft}
        busy={notices.busy}
        error={notices.error}
        onChange={notices.actions.setDraft}
        onSave={() => void notices.actions.save()}
        onClose={notices.actions.close}
      />
    </>
  );
}
