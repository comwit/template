"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Badge } from "@/lib/components/ui/badge";
import { Alert } from "@/lib/components/ui/alert";
import { Skeleton } from "@/lib/components/ui/skeleton";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import { StatusBadge } from "@/services/admin/_components/course";
import { useAdminProducts } from "@/services/admin/state/products";
import { adminRoutes } from "@/lib/admin-routes";
import { courseText } from "@/lib/ui-text";
import { BasicSection } from "./basic-section";
import { PricingSection } from "./pricing-section";
import { DescriptionSection } from "./description-section";
import { FilesSection } from "./files-section";
import { BundleSection } from "./bundle-section";
const statusLabels = { draft: "초안", published: "공개", archived: "보관" };
export function ProductEditorContent({
  productId,
}: {
  productId: string | null;
}) {
  const router = useRouter();
  const products = useAdminProducts((s) => ({
    categories: s.categories.load(),
    courses: s.courses.load(),
    draft: s.draft,
    files: s.files,
    editingId: s.editingId,
    busy: s.isSaving,
    uploading: s.isUploading,
    error: s.error,
    actions: s.actions,
  }));
  // 초안 시드는 편집 액션이 소유한다. `/products/new` 는 서버 초안을 만든 뒤 실제 id 로 바꿔치기한다.
  useEffect(() => {
    if (productId) {
      void products.actions.edit(productId);
      return;
    }
    void products.actions.startNew().then((id) => {
      if (id) router.replace(adminRoutes.productEditor(id));
    });
  }, [productId, products.actions, router]);
  const draft = products.draft;
  const ready = Boolean(productId) && products.editingId === productId;
  async function save() {
    await products.actions.save();
  }
  return (
    <AdminPage width="4xl">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <AdminPageHeader
          title={productId ? "상품 수정" : "상품 등록"}
          backHref={adminRoutes.products}
          backLabel="상품 목록"
          badge={
            ready ? (
              <span className="flex items-center gap-1.5">
                <StatusBadge
                  status={draft.status}
                  label={statusLabels[draft.status]}
                />
                <Badge variant={draft.courseIds.length ? "info" : "secondary"}>
                  {draft.courseIds.length ? "강의 묶음" : "파일"}
                </Badge>
              </span>
            ) : null
          }
          action={
            <Button
              type="submit"
              disabled={products.busy || products.uploading || !ready}
            >
              <Save className="size-4" aria-hidden="true" />
              {products.busy ? "저장 중…" : courseText.save}
            </Button>
          }
        />
        {products.error ? (
          <Alert tone="destructive">{products.error}</Alert>
        ) : null}
        {ready ? (
          <>
            <BasicSection
              draft={draft}
              categories={products.categories.data}
              onChange={products.actions.updateDraft}
            />
            <PricingSection
              draft={draft}
              onChange={products.actions.updateDraft}
            />
            <DescriptionSection
              draft={draft}
              busy={products.busy}
              onChange={products.actions.updateDraft}
              onThumbnail={products.actions.setThumbnail}
            />
            <FilesSection
              files={products.files}
              busy={products.busy}
              uploading={products.uploading}
              onUpload={(file) => void products.actions.uploadFile(file)}
              onRemove={(id) => void products.actions.removeFile(id)}
              onMove={products.actions.moveFile}
            />
            <BundleSection
              courses={products.courses.data}
              selected={draft.courseIds}
              busy={products.busy}
              onChange={products.actions.setCourses}
            />
          </>
        ) : (
          <div
            role="status"
            aria-label={courseText.loading}
            className="space-y-4"
          >
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
      </form>
    </AdminPage>
  );
}
