import { Suspense } from "react";
import { EditorSkeleton } from "@/services/admin/_components/editor-skeleton";
import ProductEditorPage from "@/services/admin/page/product-editor";

type Params = Promise<{ id: string }>;

// 상품 편집기. 파일 업로드가 상품 id 를 필요로 하므로 `new` 는 편집기가 먼저 초안을 만들고 id 로 이동한다.
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <ProductEditorRoute params={params} />
    </Suspense>
  );
}

async function ProductEditorRoute({ params }: { params: Params }) {
  const { id } = await params;
  return <ProductEditorPage productId={id === "new" ? null : id} />;
}
