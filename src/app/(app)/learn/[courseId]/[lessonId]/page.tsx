import { Suspense } from "react";
import Learn from "@/services/app/page/learn";

type Params = Promise<{ courseId: string; lessonId: string }>;

// 강의실. lessonId 가 없는 `/learn/[courseId]` 는 이어보기(마지막 레슨)로 시작한다.
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <LearnRoute params={params} />
    </Suspense>
  );
}

async function LearnRoute({ params }: { params: Params }) {
  const { courseId, lessonId } = await params;
  return <Learn courseId={courseId} lessonId={lessonId} />;
}
