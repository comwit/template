"use client";
import { useAdminReviews } from "@/services/admin/state/reviews";
import { ReviewsSection } from "./reviews-section";
import { ReviewReplyDialog } from "./review-reply-dialog";
export function ReviewsContent() {
  const reviews = useAdminReviews((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    filter: s.filter,
    selectedId: s.selectedId,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const selected = reviews.selectedId
    ? (reviews.list.data.items.find((r) => r.id === reviews.selectedId) ??
      null)
    : null;
  return (
    <>
      <ReviewsSection
        query={reviews.list}
        filter={reviews.filter}
        busy={reviews.busy}
        onFilter={reviews.actions.setFilter}
        onPage={reviews.actions.setPage}
        onRefresh={() => void reviews.actions.refresh()}
        onReply={reviews.actions.select}
        onVisibility={(id, hidden) =>
          void reviews.actions.setVisibility(id, hidden)
        }
      />
      <ReviewReplyDialog
        key={selected?.id ?? "none"}
        review={selected}
        busy={reviews.busy}
        error={reviews.error}
        onSubmit={(reply) =>
          selected ? void reviews.actions.reply(selected.id, reply) : undefined
        }
        onClose={() => reviews.actions.select(null)}
      />
    </>
  );
}
