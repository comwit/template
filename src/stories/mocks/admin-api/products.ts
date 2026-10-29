import type { AdminProductsAPI } from "@/services/admin/api/products";
import { formatMoney, type ProductView } from "@/lib/course";
import { STORY_NOW, findItem, list, mockApi } from "../runtime";
import { dateLabel, nowLabel, statusLabel } from "../labels";

export const adminProducts = {
  findAll: mockApi<AdminProductsAPI["findAll"]>((db, filter, page) =>
    list(db.products, filter, page),
  ),
  find: mockApi<AdminProductsAPI["find"]>((db, id) => findItem(db.products, id)),
  /** 파일을 올리기 전에 빈 초안을 만든다(실제 repository 와 같은 제목·슬러그 규칙). */
  createDraft: mockApi<AdminProductsAPI["createDraft"]>((db) => {
    const id = crypto.randomUUID();
    const draft: ProductView = {
      id,
      title: "새 상품",
      slug: `product-${id.slice(-12)}`,
      summary: "",
      thumbnail: null,
      categoryId: null,
      categoryName: null,
      kind: "file",
      kindLabel: statusLabel("file"),
      status: "draft",
      statusLabel: statusLabel("draft"),
      price: 0,
      discountPrice: null,
      salePrice: 0,
      priceLabel: formatMoney(0),
      originalPriceLabel: null,
      discountRate: 0,
      discountEndsLabel: null,
      discountEndsAt: null,
      isFree: true,
      downloadLimit: null,
      fileCount: 0,
      courseCount: 0,
      purchaseCount: 0,
      createdLabel: nowLabel(),
      publishedLabel: null,
      description: "",
      files: [],
      courses: [],
      purchase: null,
    };
    db.products.unshift(draft);
    return id;
  }),
  save: mockApi<AdminProductsAPI["save"]>((db, input) => {
    const id = input.id ?? crypto.randomUUID();
    const previous = db.products.find((item) => item.id === id);
    if (db.products.some((item) => item.slug === input.slug && item.id !== id))
      throw new Error("이미 사용 중인 슬러그입니다.");
    const uploaded = previous?.files ?? [];
    const files = input.fileIds.map((fileId, position) => {
      const file = uploaded.find((item) => item.id === fileId);
      if (!file || file.status !== "ready")
        throw new Error("업로드를 마치지 않은 파일이 있습니다.");
      return { ...file, position };
    });
    const courses = input.courseIds.map((courseId) => {
      const course = findItem(db.courses, courseId);
      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnail,
        lessonCount: course.lessonCount,
      };
    });
    const discounting =
      input.discountPrice !== null &&
      (!input.discountEndsAt || new Date(input.discountEndsAt) > STORY_NOW);
    const sale = discounting ? (input.discountPrice as number) : input.price;
    const product: ProductView = {
      id,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      thumbnail: input.thumbnail,
      categoryId: input.categoryId,
      categoryName:
        db.categories.find((c) => c.id === input.categoryId)?.name ?? null,
      kind: input.kind,
      kindLabel: statusLabel(input.kind),
      status: input.status,
      statusLabel: statusLabel(input.status),
      price: input.price,
      discountPrice: input.discountPrice,
      salePrice: sale,
      priceLabel: formatMoney(sale),
      originalPriceLabel: discounting ? formatMoney(input.price) : null,
      discountRate: discounting
        ? Math.round(((input.price - sale) / input.price) * 100)
        : 0,
      discountEndsLabel: discounting ? dateLabel(input.discountEndsAt) : null,
      discountEndsAt: input.discountEndsAt,
      isFree: sale === 0,
      downloadLimit: input.downloadLimit,
      fileCount: files.length,
      courseCount: courses.length,
      purchaseCount: previous?.purchaseCount ?? 0,
      createdLabel: previous?.createdLabel ?? nowLabel(),
      publishedLabel:
        input.status === "published"
          ? (previous?.publishedLabel ?? nowLabel())
          : (previous?.publishedLabel ?? null),
      description: input.description,
      files,
      courses,
      purchase: previous?.purchase ?? null,
    };
    if (previous) Object.assign(previous, product);
    else db.products.unshift(product);
    return id;
  }),
  archive: mockApi<AdminProductsAPI["archive"]>((db, id) => {
    Object.assign(findItem(db.products, id), {
      status: "archived",
      statusLabel: statusLabel("archived"),
    });
  }),
  prepareFile: mockApi<AdminProductsAPI["prepareFile"]>(() => {
    throw new Error("스토리북에서는 업로드할 수 없습니다.");
  }),
  completeFile: mockApi<AdminProductsAPI["completeFile"]>((db, fileId) => {
    for (const product of db.products) {
      const file = product.files.find((item) => item.id === fileId);
      if (!file) continue;
      file.status = "ready";
      product.fileCount = product.files.filter((item) => item.status === "ready").length;
      return file;
    }
    throw new Error("파일을 찾을 수 없습니다.");
  }),
  removeFile: mockApi<AdminProductsAPI["removeFile"]>((db, fileId) => {
    const product = db.products.find((item) =>
      item.files.some((file) => file.id === fileId),
    );
    if (!product) throw new Error("파일을 찾을 수 없습니다.");
    product.files = product.files
      .filter((file) => file.id !== fileId)
      .map((file, position) => ({ ...file, position }));
    product.fileCount = product.files.filter((file) => file.status === "ready").length;
  }),
} satisfies AdminProductsAPI;
