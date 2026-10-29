"use client";
import { useRouter } from "next/navigation";
import { useAdminProducts } from "@/services/admin/state/products";
import { adminRoutes } from "@/lib/admin-routes";
import { ProductsSection } from "./products-section";
export function ProductsContent() {
  const router = useRouter();
  const products = useAdminProducts((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    filter: s.filter,
    busy: s.isSaving,
    actions: s.actions,
  }));
  // 파일 업로드가 상품 id 를 요구하므로 서버 초안을 먼저 만들고 편집기로 간다.
  async function create() {
    const id = await products.actions.startNew();
    if (id) router.push(adminRoutes.productEditor(id));
  }
  return (
    <ProductsSection
      query={products.list}
      filter={products.filter}
      busy={products.busy}
      onFilter={products.actions.setFilter}
      onPage={products.actions.setPage}
      onRefresh={() => void products.actions.refresh()}
      onCreate={() => void create()}
      onArchive={(id) => void products.actions.archive(id)}
    />
  );
}
