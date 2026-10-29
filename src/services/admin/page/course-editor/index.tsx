"use client";
import { CourseEditorContent } from "./course-editor-content";
export default function CourseEditorPage({
  courseId,
}: {
  courseId: string | null;
}) {
  return <CourseEditorContent key={courseId ?? "new"} courseId={courseId} />;
}
