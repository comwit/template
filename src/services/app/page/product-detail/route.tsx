"use client";

import { useParams } from "next/navigation";
import ProductDetail from "./index";

/**
 * 상세 라우트 `products/[id]` 의 본문. 라우트 파일은 Server Component 로 두고(src/app 규칙) URL 의 id 는
 * 여기서 `useParams` 로 읽는다 — 서버 params 를 await 하지 않으니 본문이 정적으로 남고, 소프트 내비 때 서버를 기다리지 않는다.
 * Cache Components 프리렌더에서 suspend 하므로 라우트가 상세 뼈대 fallback 의 Suspense 로 감싼다.
 */
export function ProductDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <ProductDetail productId={id} />;
}
