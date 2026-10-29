import { courseText } from "@/lib/ui-text";

const numberFormatter = new Intl.NumberFormat("ko-KR");

/** 레슨 재생 위치가 전체 길이의 이 비율을 넘으면 완료로 본다. */
export const LESSON_COMPLETE_RATIO = 0.9;

export function formatMoney(amount: number): string {
  return amount === 0 ? courseText.free : `${numberFormatter.format(amount)}원`;
}

/** 3661 → "1시간 1분", 125 → "2분", 0 → "—" */
export function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours && minutes) return `${hours}시간 ${minutes}분`;
  if (hours) return `${hours}시간`;
  return `${Math.max(1, minutes)}분`;
}

/** Display only. Full identifiers remain available for queries and operations. */
export function formatOrderNumber(number: string): string {
  return `ORD-${number.slice(-12).toUpperCase()}`;
}

export function formatRating(sum: number, count: number): string {
  return count ? (sum / count).toFixed(1) : "—";
}

/** 유튜브 URL(watch·youtu.be·shorts·embed) 또는 11자 ID 에서 영상 ID 를 꺼낸다. */
export function youtubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/);
      return match?.[1] ?? null;
    }
  } catch {
    /* 주소가 아니면 null */
  }
  return null;
}

/** 할인 기간이 남아 있으면 할인가, 아니면 정가. */
export function salePrice(
  course: {
    price: number;
    discountPrice: number | null;
    discountEndsAt: Date | null;
  },
  now = new Date(),
): number {
  if (
    course.discountPrice !== null &&
    (!course.discountEndsAt || course.discountEndsAt > now)
  )
    return course.discountPrice;
  return course.price;
}

/** 쿠폰 할인액. 결제 금액(amount)을 넘지 않는다. */
export function couponDiscount(
  coupon: {
    type: "percent" | "fixed";
    value: number;
    maxDiscount: number | null;
  },
  amount: number,
): number {
  let discount =
    coupon.type === "percent"
      ? Math.floor((amount * coupon.value) / 100)
      : coupon.value;
  if (coupon.maxDiscount !== null)
    discount = Math.min(discount, coupon.maxDiscount);
  return Math.max(0, Math.min(discount, amount));
}
