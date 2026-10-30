"use client";

import { useParams } from "next/navigation";
import ProductDetail from "./index";

/**
 * 인터셉트 라우트 `(app)/(.)products/[id]` 의 본문. 라우트 파일은 Server Component 로 두고(src/app 규칙)
 * URL 의 id 만 여기서 `useParams` 로 읽는다 — Cache Components 프리렌더에서 suspend 하므로 라우트가 Suspense 로 감싼다.
 * 서버 데이터는 읽지 않는다. 그래야 페이지 전체가 기본 <Link> prefetch(App Shell)에 들어가 내비 때 서버 왕복이 없다.
 */
export function InterceptedProductDetail() {
  const { id } = useParams<{ id: string }>();
  return <ProductDetail productId={id} />;
}
