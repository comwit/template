import { Suspense } from "react";
import Notices, {
  NoticeList,
  NoticeListSkeleton,
} from "@/services/app/page/notices";

// 셸(제목)은 정적이라 App Shell 에 들어가 바로 뜬다. 목록은 자기 Suspense(같은 모양 뼈대) 안에서 `.suspend()` 한다.
// 직접 진입은 서비스 레이아웃 아래라 요청 시점에 SSR 되고(SEO), 앱 안에서 돌아오면 캐시로 바로 그린다(page.ai.md → Lists).
export default function Page() {
  return (
    <Notices>
      <Suspense fallback={<NoticeListSkeleton />}>
        <NoticeList />
      </Suspense>
    </Notices>
  );
}
