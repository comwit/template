import { Suspense } from "react";
import { connection } from "next/server";
import Products, {
  ProductList,
  ProductListSkeleton,
} from "@/services/app/page/products";

// 강의 목록과 같은 구조: 셸(제목)은 정적, 목록은 connection() 아래에서 `.suspend()` SSR, fallback 은 같은 모양 뼈대.
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
