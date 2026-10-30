import { Suspense } from "react";
import { connection } from "next/server";
import MyCourses, {
  MyCourseList,
  MyCourseListSkeleton,
} from "@/services/app/page/my-courses";

// 셸(제목)은 정적, 목록은 요청 시점에 세션으로 `.suspend()` SSR. 거부(비로그인)는 account/error.tsx.
export default function Page() {
  return (
    <MyCourses>
      <Suspense fallback={<MyCourseListSkeleton />}>
        <MyCourseListRoute />
      </Suspense>
    </MyCourses>
  );
}

async function MyCourseListRoute() {
  await connection();
  return <MyCourseList />;
}
