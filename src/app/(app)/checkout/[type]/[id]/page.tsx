import { Suspense } from "react";
import { notFound } from "next/navigation";
import { itemTypeSchema } from "@/lib/course";
import Checkout from "@/services/app/page/checkout";

type Params = Promise<{ type: string; id: string }>;

// `/checkout/course/[id]` 또는 `/checkout/product/[id]`. params 는 Suspense 아래에서 읽는다.
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <CheckoutRoute params={params} />
    </Suspense>
  );
}

async function CheckoutRoute({ params }: { params: Params }) {
  const { type, id } = await params;
  const itemType = itemTypeSchema.safeParse(type);
  if (!itemType.success) notFound();
  return <Checkout itemType={itemType.data} itemId={id} />;
}
