import { Suspense } from "react";
import Home, {
  NewArrivals,
  NewArrivalsSkeleton,
} from "@/services/app/page/home";

// 셸(제목·섹션 제목)은 정적, 새 상품 섹션은 자기 Suspense(카드 격자 뼈대) 안에서 `.suspend()` 한다.
// 직접 진입은 서비스 레이아웃 아래라 요청 시점에 SSR 되고(SEO), 앱 안에서 돌아오면 캐시로 바로 그린다(page.ai.md → Lists).
export default function Page() {
  return (
    <Home
      newArrivals={
        <Suspense fallback={<NewArrivalsSkeleton />}>
          <NewArrivals />
        </Suspense>
      }
    />
  );
}
