import { model, query, keepPreviousData } from "@comwit/state";
import { adminCoupons as api } from "@/services/admin/api/coupons";
import { adminCourses } from "@/services/admin/api/courses";
import {
  emptyPage,
  type CouponInput,
  type CouponView,
  type CourseSummary,
} from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const freshDraft = (): CouponInput => ({
  code: "",
  name: "",
  type: "percent",
  value: 10,
  minAmount: 0,
  maxDiscount: null,
  courseId: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perUserLimit: 1,
  active: true,
});
/** ISO 문자열을 KST 기준 datetime-local 값(`2026-10-14T10:00`)으로 바꾼다. 서버는 이 값을 KST 로 해석한다. */
export const isoToDateInput = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const v = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${v.year}-${v.month}-${v.day}T${v.hour}:${v.minute}`;
};
export const draftFromView = (coupon: CouponView): CouponInput => ({
  id: coupon.id,
  code: coupon.code,
  name: coupon.name,
  type: coupon.type,
  value: coupon.value,
  minAmount: coupon.minAmount,
  maxDiscount: coupon.maxDiscount,
  courseId: coupon.courseId,
  startsAt: isoToDateInput(coupon.startsAt),
  endsAt: isoToDateInput(coupon.endsAt),
  usageLimit: coupon.usageLimit,
  perUserLimit: coupon.perUserLimit,
  active: coupon.active,
});
export const domain = model<DomainState>({
  list: query<Pageable<CouponView>, ListArgs>({
    initialData: emptyPage<CouponView>(),
    queryFn: (arg) => api.findAll(arg.filter, arg.pageable),
    placeholderData: keepPreviousData,
  }),
  courses: query<CourseSummary[]>({
    initialData: [],
    queryFn: async () =>
      (
        await adminCourses.findAll(
          { search: "", status: "published" },
          { page: 1, limit: 100 },
        )
      ).items,
  }),
  filter: { search: "", status: "" },
  page: 1,
  draft: freshDraft(),
  editorOpen: false,
  isSaving: false,
  error: null,
});
