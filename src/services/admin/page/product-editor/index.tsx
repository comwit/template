"use client";
import { ProductEditorContent } from "./product-editor-content";
export default function ProductEditorPage({
  productId,
}: {
  productId: string | null;
}) {
  return (
    <ProductEditorContent key={productId ?? "new"} productId={productId} />
  );
}
