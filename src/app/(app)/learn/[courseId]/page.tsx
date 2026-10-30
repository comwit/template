import { Suspense } from "react";
import Learn, { LearnSkeleton } from "@/services/app/page/learn";

type Params = Promise<{ courseId: string }>;

// URL 데이터(params)는 Suspense 아래에서 읽어야 App Shell이 즉시 뜬다 (Next instant navigation 검증).
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<LearnSkeleton />}>
      <LearnRoute params={params} />
    </Suspense>
  );
}

async function LearnRoute({ params }: { params: Params }) {
  const { courseId } = await params;
  return <Learn courseId={courseId} />;
}
