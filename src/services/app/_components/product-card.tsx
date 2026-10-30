"use client";

import Link from "next/link";
import type { ProductView } from "@/lib/commerce";
import { Skeleton } from "@/lib/components/ui/skeleton";

/**
 * 상품 카드 최소 골격(목록·홈 공용). 파생 프로젝트가 브랜드에 맞게 고친다.
 * `onOpen` 은 카드의 단일 액션(`actions.open(product)`) — 상세 리소스를 채워 인터셉트 라우트가 바로 그리게 한다.
 */
export function ProductCard({
  product,
  onOpen,
}: {
  product: ProductView;
  onOpen: () => void;
}) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.id}`} onClick={onOpen} className="block">
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
