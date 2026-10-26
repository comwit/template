import { beforeEach, describe, expect, it, vi } from "vitest";

// Storybook's spies use Vitest's API; this test runs without a browser channel.
vi.mock("storybook/test", () => ({ fn: vi.fn }));

import { catalog } from "../src/stories/mocks/app-api/catalog";
import { cart } from "../src/stories/mocks/app-api/cart";
import { adminCatalog } from "../src/stories/mocks/admin-api/catalog";
import { resetApiMocks } from "../src/stories/mocks/runtime";
import { product } from "../src/stories/fixtures";

const filter = { search: "", status: "" };
const page = { page: 1, limit: 20 };

beforeEach(() => resetApiMocks());

describe("Storybook API boundary", () => {
  it("shares saved products across admin/customer APIs while cloning query results", async () => {
    const draft = await adminCatalog.find(product.id);
    draft.name = "수정한 예시 상품";
    expect((await catalog.find(product.id)).name).toBe(product.name);
    await adminCatalog.save(draft);
    expect(
      (await catalog.findAll({ ...filter, search: "수정한" }, page)).items[0]
        .name,
    ).toBe(draft.name);
    expect(
      (await catalog.findAll({ ...filter, search: "없는 상품" }, page)).total,
    ).toBe(0);
  });

  it("recalculates cart responses after a quantity mutation", async () => {
    await cart.setQuantity(product.skus[0].id, 1);
    const result = await cart.find();
    expect(result.items[0].quantity).toBe(1);
    expect(result.subtotal).toBe(29000);
    expect(result.total).toBe(32000);
    await cart.setQuantity(product.skus[0].id, 0);
    expect(await cart.find()).toMatchObject({
      items: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
    });
  });

  it("serializes reactive request proxies like the real API transport", async () => {
    const draft = structuredClone(product);
    draft.name = "프록시 저장 상품";
    const request = new Proxy(
      {
        ...draft,
        images: new Proxy(draft.images, {}),
        skus: new Proxy(
          draft.skus.map((sku) => new Proxy(sku, {})),
          {},
        ),
      },
      {},
    );
    await adminCatalog.save(request);
    draft.name = "저장 후 로컬 수정";
    expect((await adminCatalog.find(product.id)).name).toBe("프록시 저장 상품");
    expect((await catalog.findAll(filter, page)).items[0].name).toBe(
      "프록시 저장 상품",
    );
  });

  it("resets method overrides, calls and fixtures between stories", async () => {
    catalog.findAll.mockRejectedValueOnce(new Error("custom story"));
    await expect(catalog.findAll(filter, page)).rejects.toThrow("custom story");
    await cart.setQuantity(product.skus[0].id, 0);
    resetApiMocks({ mode: "empty" });
    expect(catalog.findAll).not.toHaveBeenCalled();
    expect((await catalog.findAll(filter, page)).items).toEqual([]);
    resetApiMocks();
    expect((await cart.find()).items[0].quantity).toBe(2);
    expect((await catalog.findAll(filter, page)).total).toBe(1);
  });

  it("does not let a delayed previous story mutate the next story", async () => {
    resetApiMocks({ delay: 20 });
    const previous = cart.setQuantity(product.skus[0].id, 0);
    resetApiMocks();
    await previous;
    expect((await cart.find()).items[0].quantity).toBe(2);
  });

  it("supplies API-level failures and restores successful responses", async () => {
    resetApiMocks({ mode: "error" });
    await expect(catalog.findAll(filter, page)).rejects.toThrow(
      "스토리북 API 오류",
    );
    resetApiMocks();
    expect((await catalog.findAll(filter, page)).items).toHaveLength(1);
  });
});
