"use client";

import { useState } from "react";
import { useCatalog } from "@/services/app/state/catalog";
import { courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";

// 읽는 상태: useCatalog reviews(.load({ courseId, page })). 상세 본문을 막지 않도록 별도 query 로 지연 로드한다.
export function ReviewsSection({ courseId }: { courseId: string }) {
  const [page, setPage] = useState(1);
  const catalog = useCatalog((state) => ({
    reviews: state.reviews.load({ courseId, page }),
  }));
  const reviews = catalog.reviews;
  return (
    <section className="mt-10">
      <h2 className="text-title-lg">
        {courseText.reviews}
        <span className="ml-2 text-body-sm text-muted-foreground">
          {reviews.data.total}
        </span>
      </h2>
      {reviews.isError ? (
        <p className="mt-2 text-body-sm text-destructive">
          {reviews.error}
        </p>
      ) : reviews.isLoading ? (
        <p className="mt-2 text-body-sm text-muted-foreground">
          {courseText.loading}
        </p>
      ) : reviews.data.items.length === 0 ? (
        <p className="mt-2 text-body-sm text-muted-foreground">
          {courseText.empty}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-3">
          {reviews.data.items.map((review) => (
            <li key={review.id}>
              <p className="text-body-sm text-muted-foreground">
                {"★".repeat(review.rating)} · {review.userName} ·{" "}
                {review.createdLabel}
              </p>
              <p className="text-body">{review.content}</p>
              {review.adminReply ? (
                <p className="mt-1 text-body-sm text-soft-foreground">
                  답변: {review.adminReply}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={reviews.data.page}
        totalPages={reviews.data.totalPages}
        onChange={setPage}
      />
    </section>
  );
}
