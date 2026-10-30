import { Suspense } from "react";
import { connection } from "next/server";
import Home, {
  NewArrivals,
  NewArrivalsSkeleton,
} from "@/services/app/page/home";

// 셸(제목·섹션 제목)은 정적, 새 상품 섹션만 connection() 아래에서 `.suspend()` SSR(SEO).
// fallback 은 같은 격자의 카드 뼈대라 섹션이 들어와도 화면이 밀리지 않는다.
export default function Page() {
  return (
    <Home
      newArrivals={
        <Suspense fallback={<NewArrivalsSkeleton />}>
          <NewArrivalsRoute />
        </Suspense>
      }
    />
  );
}

async function NewArrivalsRoute() {
  await connection();
  return <NewArrivals />;
}
