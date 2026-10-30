import { Suspense } from "react";
import { connection } from "next/server";
import MyProducts, {
  MyProductList,
  MyProductListSkeleton,
} from "@/services/app/page/my-products";

// 셸(제목)은 정적, 목록은 요청 시점에 세션으로 `.suspend()` SSR. 거부(비로그인)는 account/error.tsx.
export default function Page() {
  return (
    <MyProducts>
      <Suspense fallback={<MyProductListSkeleton />}>
        <MyProductListRoute />
      </Suspense>
    </MyProducts>
  );
}

async function MyProductListRoute() {
  await connection();
  return <MyProductList />;
}
