import { Suspense } from "react";
import Checkout from "@/services/app/page/checkout";

type Params = Promise<{ courseId: string }>;

// URL 데이터(params)는 Suspense 아래에서 읽어야 App Shell이 즉시 뜬다 (Next instant navigation 검증).
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <CheckoutRoute params={params} />
    </Suspense>
  );
}

async function CheckoutRoute({ params }: { params: Params }) {
  const { courseId } = await params;
  return <Checkout courseId={courseId} />;
}
