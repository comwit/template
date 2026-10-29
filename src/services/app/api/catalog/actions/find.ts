"use server";
import { createAction } from "@/lib/utils";
import type * as Types from "../types";
import * as input from "@/lib/course";
import { courseAction, presentCourseDetail } from "@/server/course";
import { catalogRepository, enrollmentRepository } from "@/server/repository";
import { getAppServerSession } from "@/server/auth/app";
async function _find(id: string): Promise<Types.CourseView> {
  return courseAction(async () => {
    const session = await getAppServerSession();
    const course = await catalogRepository.findById(input.entityId.parse(id), true);
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
