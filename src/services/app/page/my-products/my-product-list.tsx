"use client";

import Link from "next/link";
import { usePurchases } from "@/services/app/state/purchases";
import { siteText, courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";
import { EmptyState } from "@/lib/components/ui/empty-state";
import { Button } from "@/lib/components/ui/button";

// 읽는 상태: usePurchases list(.suspend({ page })), isSaving. 로그인 필요 — 거부되면 (app)/account/error.tsx.
// 파일마다 "다운로드" → actions.downloadLink(fileId) 가 짧게 사는 주소를 받아 새 탭으로 연다(호출마다 횟수 차감).

export function MyProductList() {
  const purchases = usePurchases((state) => ({
    list: state.list.suspend({ page: state.page }),
    isSaving: state.isSaving,
    actions: state.actions,
  }));
  const list = purchases.list;
  return (
    <>
      {list.isError ? (
        <p className="mt-8 text-body text-destructive">
          {list.error}{" "}
          <Link href="/login" className="underline">
            {siteText.pages["login"]}
          </Link>
        </p>
      ) : list.data.items.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={courseText.empty}
          action={
            <Button asChild>
              <Link href="/products">{siteText.pages["products"]}</Link>
            </Button>
          }
        />
      ) : (
        <ul
          aria-busy={list.isFetching}
          className="mt-8 flex flex-col gap-6">
          {list.data.items.map((purchase) => (
            <li key={purchase.id}>
              <p className="text-title-md">{purchase.productTitle}</p>
              <p className="text-body-sm text-muted-foreground">
                {purchase.statusLabel} · {purchase.sourceLabel} ·{" "}
                {purchase.downloadsLabel} · {purchase.purchasedLabel}
                {purchase.lastDownloadedLabel
                  ? ` · 마지막 다운로드 ${purchase.lastDownloadedLabel}`
                  : ""}
              </p>
              {purchase.files.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1 text-body">
                  {purchase.files.map((file) => (
                    <li key={file.id} className="flex items-center gap-3">
                      <span>
                        {file.name}{" "}
                        <span className="text-body-sm text-muted-foreground">
                          {file.sizeLabel}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={purchases.isSaving || purchase.status !== "active"}
                        onClick={() => purchases.actions.downloadLink(file.id)}
                      >
                        다운로드
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {purchase.courses.length > 0 ? (
                <p className="mt-2 flex flex-wrap gap-3 text-body-sm">
                  {purchase.courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/learn/${course.id}`}
                      className="underline"
                    >
                      {course.title} · {siteText.pages["learn"]}
                    </Link>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={list.data.page}
        totalPages={list.data.totalPages}
        onChange={(page) => purchases.actions.setPage(page)}
      />
    </>
  );
}
