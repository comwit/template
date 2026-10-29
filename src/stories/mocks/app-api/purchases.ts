import type { PurchasesAPI } from "@/services/app/api/purchases";
import { STORY_NOW, mockApi, paginate } from "../runtime";
import { nowLabel } from "../labels";
import { downloadsLabel } from "../grants";
import type { MockData } from "../data";

const mine = (db: MockData) =>
  db.purchases.filter((item) => item.userId === db.appUser?.id);

export const purchases = {
  findAll: mockApi<PurchasesAPI["findAll"]>((db, page) => paginate(mine(db), page)),
  /** 가짜 주소를 돌려주고 남은 횟수를 줄인다. 실제 파일은 내려받지 않는다. */
  downloadLink: mockApi<PurchasesAPI["downloadLink"]>((db, fileId) => {
    if (!db.appUser) throw new Error("로그인이 필요합니다.");
    const purchase = mine(db).find(
      (item) =>
        item.status === "active" &&
        item.files.some((file) => file.id === fileId && file.status === "ready"),
    );
    if (!purchase) {
      const exists = db.products.some((product) =>
        product.files.some((file) => file.id === fileId),
      );
      throw new Error(
        exists ? "구매한 상품만 내려받을 수 있습니다." : "파일을 찾을 수 없습니다.",
      );
    }
    const file = purchase.files.find((item) => item.id === fileId)!;
    const limit = purchase.downloadLimit;
    if (limit !== null && purchase.downloadCount >= limit)
      throw new Error(`다운로드 횟수(${limit}회)를 모두 사용했습니다.`);
    purchase.downloadCount += 1;
    purchase.downloadsLabel = downloadsLabel(purchase.downloadCount, limit);
    purchase.lastDownloadedLabel = nowLabel();
    return {
      url: `https://example.test/storybook/downloads/${file.id}/${encodeURIComponent(file.name)}`,
      method: "GET",
      headers: {},
      expiresAt: new Date(STORY_NOW.getTime() + 15 * 60 * 1000).toISOString(),
      fileName: file.name,
      remaining: limit === null ? null : limit - purchase.downloadCount,
    };
  }),
} satisfies PurchasesAPI;
