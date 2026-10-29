import { Suspense } from "react";
import NoticeDetail from "@/services/app/page/notice-detail";

type Params = Promise<{ id: string }>;

// URL 데이터(params)는 Suspense 아래에서 읽어야 App Shell이 즉시 뜬다 (Next instant navigation 검증).
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <NoticeDetailRoute params={params} />
    </Suspense>
  );
}

async function NoticeDetailRoute({ params }: { params: Params }) {
  const { id } = await params;
  return <NoticeDetail noticeId={id} />;
}
