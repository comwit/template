import { Suspense } from "react";
import CourseEditorPage from "@/services/admin/page/course-editor";

type Params = Promise<{ id: string }>;

// `/courses/new` 는 새 강의, 그 외는 기존 강의 id. params 는 Suspense 아래에서 읽는다.
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <CourseEditorRoute params={params} />
    </Suspense>
  );
}

async function CourseEditorRoute({ params }: { params: Params }) {
  const { id } = await params;
  return <CourseEditorPage courseId={id === "new" ? null : id} />;
}
