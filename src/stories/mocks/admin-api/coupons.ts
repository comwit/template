import type { AdminCouponsAPI } from "@/services/admin/api/coupons";
import { formatMoney, type CouponView } from "@/lib/course";
import { STORY_NOW, findItem, list, mockApi } from "../runtime";
import { dateLabel, nowLabel, statusLabel } from "../labels";

function couponStatus(coupon: {
  active: boolean;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
}): CouponView["status"] {
  if (!coupon.active) return "inactive";
  if (coupon.endsAt && new Date(coupon.endsAt) <= STORY_NOW) return "expired";
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
    return "exhausted";
  return "active";
}
const couponStatusLabel = (status: CouponView["status"]) =>
  status === "active" ? "사용 가능" : statusLabel(status);

export const adminCoupons = {
  findAll: mockApi<AdminCouponsAPI["findAll"]>((db, filter, page) =>
    list(db.coupons, filter, page),
  ),
  save: mockApi<AdminCouponsAPI["save"]>((db, input) => {
    const id = input.id ?? crypto.randomUUID();
    const previous = db.coupons.find((item) => item.id === id);
    if (db.coupons.some((item) => item.code === input.code && item.id !== id))
      throw new Error("이미 사용 중인 쿠폰 코드입니다.");
    const usedCount = previous?.usedCount ?? 0;
    const status = couponStatus({ ...input, usedCount });
    const coupon: CouponView = {
      id,
      code: input.code,
      name: input.name,
      type: input.type,
      typeLabel: statusLabel(input.type),
      value: input.value,
      valueLabel:
        input.type === "percent" ? `${input.value}%` : formatMoney(input.value),
      minAmount: input.minAmount,
      minAmountLabel: formatMoney(input.minAmount),
      maxDiscount: input.maxDiscount,
      courseId: input.courseId,
      courseTitle:
        db.courses.find((c) => c.id === input.courseId)?.title ?? null,
      startsLabel: dateLabel(input.startsAt),
      endsLabel: dateLabel(input.endsAt),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      usageLimit: input.usageLimit,
      usedCount,
      usageLabel:
        input.usageLimit === null
          ? `${usedCount}회`
          : `${usedCount}/${input.usageLimit}회`,
      perUserLimit: input.perUserLimit,
      active: input.active,
      status,
      statusLabel: couponStatusLabel(status),
      createdLabel: previous?.createdLabel ?? nowLabel(),
    };
    if (previous) Object.assign(previous, coupon);
    else db.coupons.unshift(coupon);
    return id;
  }),
  setActive: mockApi<AdminCouponsAPI["setActive"]>((db, id, active) => {
    const coupon = findItem(db.coupons, id);
    coupon.active = active;
    const status = couponStatus(coupon);
    coupon.status = status;
    coupon.statusLabel = couponStatusLabel(status);
  }),
} satisfies AdminCouponsAPI;
