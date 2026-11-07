"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentCourseDetail } from "@/server/course";
import {
  CourseError,
  catalogRepository,
  enrollmentRepository,
} from "@/server/repository";
import { getAppServerSession } from "@/server/auth/app";
// 잘못된 id·없는·비공개 강의는 오류가 아니라 null 이다. 상세 query 가 `data === null` 을 "없는 강의"로 그리고,
// 목록 seed 로 먼저 그린 화면도 이 null 로 안내 화면으로 바뀐다(state.ai.md → Detail seed).
async function _find(id: string): Promise<Types.CourseView | null> {
  return courseAction(async () => {
    if (!input.entityId.safeParse(id).success) return null;
    let course: Awaited<ReturnType<typeof catalogRepository.findById>>;
    try {
      course = await catalogRepository.findById(id, true);
    } catch (error) {
      if (error instanceof CourseError && error.code === "NOT_FOUND") return null;
      throw error;
    }
    const session = await getAppServerSession();
    const enrollment = session?.user
      ? await enrollmentRepository.findActive(course.id, session.user.id)
      : null;
    return presentCourseDetail(
      course,
      enrollment ? "full" : "public",
      enrollment
        ? {
            id: enrollment.id,
            progressPercent: enrollment.progressPercent,
            lastLessonId: enrollment.lastLessonId,
          }
        : null,
    );
  });
}
export const find = createAction(_find);
