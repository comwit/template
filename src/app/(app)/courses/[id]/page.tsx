import { Suspense, cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { entityId } from "@/lib/course";
import { siteText } from "@/lib/ui-text";
import { presentCourse } from "@/server/course";
import { CourseError, catalogRepository } from "@/server/repository";
import CourseDetail, {
  CourseDetailSkeleton,
} from "@/services/app/page/course-detail";

type Params = Promise<{ id: string }>;

// 정식 라우트. 직접 진입·새로고침·공유 링크·봇만 여기로 온다 — 앱 안 소프트 내비는 `(.)courses/[id]` 인터셉트가 잡는다.
// 404 판단·metadata 용 RSC 조회는 한 요청에 한 번(React cache). 화면 데이터는 CourseDetail 의 `.suspend(id)` 가
// 같은 요청에서 SSR 한다. 잘못된 id·없는·비공개 강의(NOT_FOUND)만 null, 다른 오류는 그대로 던진다.
const findCourse = cache(async (id: string) => {
  if (!entityId.safeParse(id).success) return null;
  try {
    return presentCourse(await catalogRepository.findById(id, true));
  } catch (error) {
    if (error instanceof CourseError && error.code === "NOT_FOUND") return null;
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await findCourse(id);
  if (!course)
    return {
      title: siteText.pages["course-detail"],
      robots: { index: false, follow: false },
    };
  const description = course.summary.slice(0, 160) || undefined;
  const image = course.thumbnail;
  return {
    title: course.title,
    description,
    openGraph: {
      title: course.title,
      description,
      images: image
        ? [{ url: image.url, width: image.width, height: image.height }]
        : undefined,
    },
  };
}

// URL 데이터(params)는 Suspense 아래에서 읽어야 App Shell 이 즉시 뜬다. fallback 은 null 이 아니라 뼈대다.
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <CourseDetailRoute params={params} />
    </Suspense>
  );
}

async function CourseDetailRoute({ params }: { params: Params }) {
  const { id } = await params;
  if (!(await findCourse(id))) notFound();
  return <CourseDetail courseId={id} />;
}
