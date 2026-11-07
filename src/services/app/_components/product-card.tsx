"use client";

import Link from "next/link";
import type { ProductView } from "@/lib/commerce";
import { Skeleton } from "@/lib/components/ui/skeleton";

/**
 * 상품 카드 최소 골격(목록·홈 공용). 파생 프로젝트가 브랜드에 맞게 고친다.
 * 정식 상세 주소로 가는 평범한 `<Link>` 다 — 클릭 액션이 없다. 상세는 detail 모델의 `seed` 가 list 캐시에서 이 항목을 찾아
 * 바로 그린다(state.ai.md → Detail seed).
 */
export function ProductCard({ product }: { product: ProductView }) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.id}`} className="block">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-card bg-muted">
        {image ? (
          <img
            src={image.thumb ?? image.url}
            width={image.width}
            height={image.height}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <p className="mt-3 line-clamp-2 text-body">{product.name}</p>
      <p className="mt-1 text-label">{product.priceLabel}</p>
    </Link>
  );
}

/** ProductCard 와 같은 자리·크기의 뼈대. 목록·홈 Suspense fallback 이 쓴다. */
export function ProductCardBones() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[3/4] w-full rounded-card" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-1 h-5 w-16" />
    </div>
  );
}
