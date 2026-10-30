import { Suspense } from "react";
import { connection } from "next/server";
import Products, {
  ProductList,
  ProductListSkeleton,
} from "@/services/app/page/products";

// 셸(제목)은 정적이라 App Shell 에 들어가 바로 뜬다. 목록은 `.suspend()` 로 요청 시점에 SSR 하므로(SEO)
// connection() 으로 동적 구멍을 두고, fallback 은 null 이 아니라 목록과 같은 모양의 뼈대다(레이아웃 시프트 없음).
export default function Page() {
  return (
    <Products>
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductListRoute />
      </Suspense>
    </Products>
  );
}

async function ProductListRoute() {
  await connection();
  return <ProductList />;
}
