"use client";

import { Suspense, useState } from "react";
import { useCatalog } from "@/services/app/state/catalog";
import { courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";
import { Skeleton } from "@/lib/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

// 수강평은 상세 본문과 다른 query 라 자기 Suspense 경계 안에서 `.suspend()` 한다 — 본문(detail)을 막지 않는다.
// 직접 진입은 같은 요청에서 SSR, 카드로 들어오면 본문이 먼저 그려지고 이 섹션만 뼈대 뒤 클라에서 받는다.
export function ReviewsSection({ courseId }: { courseId: string }) {
  return (
    <section className="mt-10">
      <Suspense fallback={<ReviewsBones />}>
        <ReviewList courseId={courseId} />
      </Suspense>
    </section>
  );
}

// 읽는 상태: useCatalog reviews(.suspend({ courseId, page })). 페이지는 이 상세 화면 안의 상태이고, 바꾸면 keepPreviousData 로 지금 목록을 유지한다.
function ReviewList({ courseId }: { courseId: string }) {
  const [page, setPage] = useState(1);
  const catalog = useCatalog((state) => ({
    reviews: state.reviews.suspend({ courseId, page }),
  }));
  const reviews = catalog.reviews;
  return (
    <>
      <h2 className="text-title-lg">
        {courseText.reviews}
        <span className="ml-2 text-body-sm text-muted-foreground">
          {reviews.data.total}
        </span>
      </h2>
      {reviews.isError ? (
        <p className="mt-2 text-body-sm text-destructive">{reviews.error}</p>
      ) : reviews.data.items.length === 0 ? (
        <p className="mt-2 text-body-sm text-muted-foreground">
          {courseText.empty}
        </p>
      ) : (
        <ul
          aria-busy={reviews.isFetching}
          className={cn("mt-2 flex flex-col gap-3", reviews.isFetching && "opacity-60")}
        >
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
        onChange={(next) => setPage(next)}
      />
    </>
  );
}

function ReviewsBones() {
  return (
    <div aria-busy="true">
      <h2 className="text-title-lg">{courseText.reviews}</h2>
      <div className="mt-2 space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
