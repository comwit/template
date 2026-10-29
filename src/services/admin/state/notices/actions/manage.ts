import { action } from "@comwit/state";
import { adminNotices as api } from "@/services/admin/api/notices";
import { mutate } from "@/lib/course-state";
import { popup } from "@/lib/popup";
import type { ListFilter, NoticeInput } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain, freshDraft } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class ManageActions {
    private model = state(domain);
    setFilter(filter: Partial<ListFilter>) {
      this.model.filter = { ...this.model.filter, ...filter };
      this.model.page = 1;
    }
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await this.model.list.refetch();
    }
    openNew() {
      this.model.draft = freshDraft();
      this.model.error = null;
      this.model.editorOpen = true;
    }
    async edit(id: string) {
      await mutate(this.model, async () => {
        const notice = await api.find(id);
        this.model.draft = {
          id: notice.id,
          title: notice.title,
          content: notice.content,
          pinned: notice.pinned,
          status: notice.status,
        };
        this.model.editorOpen = true;
      });
    }
    close() {
      if (!this.model.isSaving) this.model.editorOpen = false;
    }
    setDraft(draft: NoticeInput) {
      this.model.draft = draft;
    }
    async save() {
      await mutate(
        this.model,
        async () => {
          await api.save(this.model.draft);
          this.model.editorOpen = false;
          await this.refresh();
        },
        "공지를 저장했습니다.",
      );
    }
    async remove(id: string) {
      if (
        !(await popup.confirm({
          title: "공지를 삭제할까요?",
          description: "삭제한 공지는 되돌릴 수 없습니다.",
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
        "공지를 삭제했습니다.",
      );
    }
  }
  return new ManageActions();
});
