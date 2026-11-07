"use client";

import Link from "next/link";
import { Button } from "@/lib/components/ui/button";

/**
 * 상세 뷰가 `detail.data === null` 일 때 그리는 안내. 잘못된 id·없는·비공개 상품은 queryFn 이 null 을 돌려주고,
 * 목록 캐시에 남은 삭제 상품도 seed 위의 재조회가 null 로 올라와 여기로 온다. 라우트의 generateMetadata 는 같은 경우 noindex 를 낸다.
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
