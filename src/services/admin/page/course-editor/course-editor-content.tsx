"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Alert } from "@/lib/components/ui/alert";
import { Skeleton } from "@/lib/components/ui/skeleton";
import { AdminPage, AdminPageHeader } from "@/services/admin/_components";
import { StatusBadge } from "@/services/admin/_components/course";
import { useAdminCourses } from "@/services/admin/state/courses";
import { adminRoutes } from "@/lib/admin-routes";
import { courseText } from "@/lib/ui-text";
import { BasicSection } from "./basic-section";
import { PricingSection } from "./pricing-section";
import { DescriptionSection } from "./description-section";
import { CurriculumSection } from "./curriculum-section";
const statusLabels = { draft: "초안", published: "공개", archived: "보관" };
export function CourseEditorContent({ courseId }: { courseId: string | null }) {
  const router = useRouter();
  const courses = useAdminCourses((s) => ({
    categories: s.categories.load(),
    instructors: s.instructors.load(),
    draft: s.draft,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  // 초안 시드는 쿼리가 아니라 편집 액션이 소유한다. courseId 가 바뀔 때만 다시 불러온다.
  useEffect(() => {
    if (courseId) void courses.actions.edit(courseId);
    else courses.actions.startNew();
  }, [courseId, courses.actions]);
  const draft = courses.draft;
  const ready = courseId ? draft.id === courseId : draft.id === undefined;
  async function save() {
    const id = await courses.actions.save();
    if (id && !courseId) router.replace(adminRoutes.courseEditor(id));
  }
  return (
    <AdminPage width="4xl">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <AdminPageHeader
          title={courseId ? "강의 수정" : courseText.addCourse}
          backHref={adminRoutes.courses}
          backLabel="강의 목록"
          badge={
            ready && courseId ? (
              <StatusBadge
                status={draft.status}
                label={statusLabels[draft.status]}
              />
            ) : null
          }
          action={
            <Button type="submit" disabled={courses.busy || !ready}>
              <Save className="size-4" aria-hidden="true" />
              {courses.busy ? "저장 중…" : courseText.save}
            </Button>
          }
        />
        {courses.error ? <Alert tone="destructive">{courses.error}</Alert> : null}
        {ready ? (
          <>
            <BasicSection
              draft={draft}
              categories={courses.categories.data}
              instructors={courses.instructors.data}
              onChange={courses.actions.updateDraft}
            />
            <PricingSection draft={draft} onChange={courses.actions.updateDraft} />
            <DescriptionSection
              draft={draft}
              busy={courses.busy}
              onChange={courses.actions.updateDraft}
              onThumbnail={courses.actions.setThumbnail}
            />
            <CurriculumSection
              draft={draft}
              busy={courses.busy}
              onAddSection={courses.actions.addSection}
              onRemoveSection={courses.actions.removeSection}
              onMoveSection={courses.actions.moveSection}
              onUpdateSection={courses.actions.updateSection}
              onAddLesson={courses.actions.addLesson}
              onRemoveLesson={courses.actions.removeLesson}
              onMoveLesson={courses.actions.moveLesson}
              onUpdateLesson={courses.actions.updateLesson}
            />
          </>
        ) : (
          <div role="status" aria-label={courseText.loading} className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
      </form>
    </AdminPage>
  );
}
