import { kstCompactDateTime } from "@/lib/kst";
import { STORY_NOW } from "./runtime";

/** 서버 presenter 의 상태 라벨 축약본. 스토리북 저장 결과에만 쓴다. */
const labels: Record<string, string> = {
  draft: "초안",
  published: "공개",
  archived: "비공개",
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급",
  pending: "대기",
  confirmed: "결제 완료",
  cancelled: "취소",
  expired: "만료",
  refunded: "환불",
  free: "무료",
  unpaid: "미결제",
  paid: "결제 완료",
  done: "결제 완료",
  succeeded: "완료",
  approved: "승인",
  rejected: "거절",
  active: "수강 중",
  revoked: "회수",
  order: "결제",
  manual: "수동 부여",
  visible: "공개",
  hidden: "숨김",
  open: "답변 대기",
  answered: "답변 완료",
  closed: "닫힘",
  percent: "정률",
  fixed: "정액",
  inactive: "중지",
  exhausted: "소진",
  course: "강의",
  product: "상품",
  file: "파일",
  bundle: "강의 묶음",
  free_course: "무료 강의",
  free_product: "무료 자료",
};
export const statusLabel = (status: string) => labels[status] ?? status;
export const nowLabel = () => kstCompactDateTime(STORY_NOW);
export const dateLabel = (iso: string | null | undefined) =>
  iso ? kstCompactDateTime(new Date(iso)) : null;
