"use client";

import Link from "next/link";
import { Button } from "@/lib/components/ui/button";

/**
 * 상세 라우트 공용 안내. 정식 라우트는 RSC 가 `notFound()` 로 먼저 거르고, 인터셉트 라우트는
 * 목록 캐시에 남은 삭제 상품(재조회 NOT_FOUND)·캐시 없는 잘못된 id(`error.tsx`)가 여기로 온다.
 */
export function ProductNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-start gap-3 px-6 py-16">
      <h1 className="text-display-sm text-balance">상품을 찾을 수 없습니다</h1>
      <p className="text-body text-soft-foreground">
        판매가 끝났거나 주소가 바뀐 상품이에요.
      </p>
      <Button asChild className="mt-2">
        <Link href="/products">상품 목록으로</Link>
      </Button>
    </main>
  );
}
