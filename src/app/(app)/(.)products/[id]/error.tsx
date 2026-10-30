"use client";

import { ProductNotFound } from "@/services/app/page/product-detail/not-found";

// 인터셉트 라우트에는 서버 404 판단이 없다. 캐시 없이 들어온 잘못된 id 는 `.suspend()` 가 던진 오류로 여기 온다.
export default function InterceptedProductError() {
  return <ProductNotFound />;
}
