import { Suspense } from "react";
import { connection } from "next/server";
import Orders, {
  OrderList,
  OrderListSkeleton,
} from "@/services/app/page/orders";

// 셸(제목)은 정적, 목록은 요청 시점에 세션으로 `.suspend()` SSR. 거부(비로그인)는 account/error.tsx.
export default function Page() {
  return (
    <Orders>
      <Suspense fallback={<OrderListSkeleton />}>
        <OrderListRoute />
      </Suspense>
    </Orders>
  );
}

async function OrderListRoute() {
  await connection();
  return <OrderList />;
}
