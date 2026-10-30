import { Suspense } from "react";
import OrderDetail, {
  OrderDetailSkeleton,
} from "@/services/app/page/order-detail";

type Params = Promise<{ id: string }>;

// URL 데이터(params)는 Suspense 아래에서 읽어야 App Shell이 즉시 뜬다 (Next instant navigation 검증).
// fallback 은 null 이 아니라 화면과 같은 모양의 뼈대다(레이아웃 시프트 없음).
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetailRoute params={params} />
    </Suspense>
  );
}

async function OrderDetailRoute({ params }: { params: Params }) {
  const { id } = await params;
  return <OrderDetail orderId={id} />;
}
