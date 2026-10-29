"use client";

import Link from "next/link";
import { Button } from "@/lib/components/ui/button";

/**
 * 상품 상세 안내. 정식 라우트는 RSC 가 `notFound()` 로 먼저 거르고,
 * 목록 캐시에 남은 비공개 상품(재조회 NOT_FOUND)이 여기로 온다.
 */
export function ProductNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-start gap-3 px-6 py-16">
      <h1 className="text-display-sm text-balance">상품을 찾을 수 없습니다</h1>
      <p className="text-body text-soft-foreground">
        판매가 끝났거나 주소가 바뀐 상품입니다.
      </p>
      <Button asChild className="mt-2">
        <Link href="/products">자료 목록으로</Link>
      </Button>
    </main>
  );
}
