"use client";
import { useState } from "react";
import { useAdminCatalog } from "@/services/admin/state/catalog";
import { ProductsSection } from "./products-section";
import { ProductEditor } from "./product-editor";
import { ProductImages } from "./product-images";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/lib/components/ui/dialog";
import { Input } from "@/lib/components/ui/input";
import { Button } from "@/lib/components/ui/button";
import { TextField } from "@/lib/components/ui/text-field";
import { Alert } from "@/lib/components/ui/alert";
export function ProductsContent() {
  const catalog = useAdminCatalog((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    categories: s.categories.load(),
    filter: s.filter,
    draft: s.draft,
    editorOpen: s.editorOpen,
    isSaving: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  return (
    <>
      <ProductsSection
        query={catalog.list}
        filter={catalog.filter}
        busy={catalog.isSaving}
        onFilter={catalog.actions.setFilter}
        onPage={catalog.actions.setPage}
        onRefresh={() => void catalog.actions.refresh()}
        onCreate={catalog.actions.openNew}
        onEdit={(id) => void catalog.actions.edit(id)}
        onArchive={(id) => void catalog.actions.archive(id)}
        onCategory={() => setCategoryOpen(true)}
      />
      <ProductEditor
        open={catalog.editorOpen}
        draft={catalog.draft}
        categories={catalog.categories.data}
        busy={catalog.isSaving}
        error={catalog.error}
        onChange={catalog.actions.setDraft}
        onAddSku={catalog.actions.addSku}
        onRemoveSku={catalog.actions.removeSku}
        onSave={() => void catalog.actions.save()}
        onClose={catalog.actions.close}
        images={<ProductImages />}
      />
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>카테고리</DialogTitle>
            <DialogDescription className="sr-only">
              상품을 분류할 카테고리를 등록하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 text-body-sm">
            {catalog.categories.data.map((c) => (
              <Button
                key={c.id}
                variant={categoryId === c.id ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setCategoryId(c.id);
                  setCategoryName(c.name);
                  setCategorySlug(c.slug);
                }}
              >
                {c.name}
              </Button>
            ))}
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void catalog.actions.saveCategory({
                id: categoryId,
                name: categoryName,
                slug: categorySlug,
              });
            }}
          >
            <TextField label="카테고리명" required>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </TextField>
            <TextField
              label="주소"
              helperText="영문 소문자, 숫자, 하이픈"
              required
            >
              <Input
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                required
              />
            </TextField>
            {catalog.error ? (
              <Alert tone="destructive">{catalog.error}</Alert>
            ) : null}
            <Button type="submit" disabled={catalog.isSaving}>
              {categoryId ? "수정" : "등록"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCategoryId(undefined);
                setCategoryName("");
                setCategorySlug("");
              }}
            >
              새 카테고리
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
