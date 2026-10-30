"use client";

import { AccountError } from "@/services/app/page/account/account-error";

// 내 강의실 목록·상세는 `.suspend()` 로 읽는다. 캐시 없이 받은 오류(비로그인 거부 등)는 이 경계가 그린다.
export default function AccountErrorBoundary({ error }: { error: Error }) {
  return <AccountError error={error} />;
}
