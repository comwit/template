import { Suspense } from "react";
import { connection } from "next/server";
import Notices, {
  NoticeList,
  NoticeListSkeleton,
} from "@/services/app/page/notices";

// 셸(제목)은 정적, 목록은 connection() 아래에서 `.suspend()` SSR(SEO), fallback 은 같은 모양 뼈대.
export default function Page() {
  return (
    <Notices>
      <Suspense fallback={<NoticeListSkeleton />}>
        <NoticeListRoute />
      </Suspense>
    </Notices>
  );
}

async function NoticeListRoute() {
  await connection();
  return <NoticeList />;
}
