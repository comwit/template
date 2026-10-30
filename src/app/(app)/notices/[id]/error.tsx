"use client";

import { NoticeNotFound } from "@/services/app/page/notice-detail/not-found";

// 공지 상세는 `.suspend()` 로 읽는다. 캐시 없이 받은 오류(없는·비공개 공지)는 이 경계가 그린다.
export default function NoticeError() {
  return <NoticeNotFound />;
}
