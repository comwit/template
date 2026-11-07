import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { entityId } from "@/lib/course";
import { siteText } from "@/lib/ui-text";
import { presentCourse } from "@/server/course";
import { CourseError, catalogRepository } from "@/server/repository";
import {
  CourseDetailRoute,
  CourseDetailSkeleton,
} from "@/services/app/page/course-detail";

type Params = Promise<{ id: string }>;

// 강의 상세의 유일한 라우트. 본문은 정적이고 서버 조회는 generateMetadata 하나다(src/app/.ai.md → Data routes).
// 화면 데이터는 CourseDetail 의 `.suspend(id)` 가 읽는다 — 직접 진입은 같은 요청에서 SSR(SEO), 목록에서 들어오면
// 모델의 seed 로 바로 그린다. 잘못된 id·없는·비공개 강의(NOT_FOUND)만 null(noindex), 다른 오류는 그대로 던진다.
async function findCourse(id: string) {
  if (!entityId.safeParse(id).success) return null;
  try {
    return presentCourse(await catalogRepository.findById(id, true));
  } catch (error) {
    if (error instanceof CourseError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

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

// 본문에서는 params 도 데이터도 await 하지 않는다. 그래야 소프트 내비 때 서버를 기다리지 않고 본문이 바로 그려진다.
// id 는 CourseDetailRoute 가 클라에서 useParams 로 읽고, 없는 강의는 화면이 `data === null` 로 안내한다.
export default function Page() {
  return (
    <>
      <Suspense fallback={<CourseDetailSkeleton />}>
        <CourseDetailRoute />
      </Suspense>
      <Suspense>
        <Connection />
      </Suspense>
    </>
  );
}

/** 동적 마커. metadata 는 요청 시점에 만들고 본문은 정적 셸로 남긴다. */
async function Connection() {
  await connection();
  return null;
}
