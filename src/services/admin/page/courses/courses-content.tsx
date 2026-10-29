"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCourses } from "@/services/admin/state/courses";
import { adminRoutes } from "@/lib/admin-routes";
import { CoursesSection } from "./courses-section";
import { CategoryDialog } from "./category-dialog";
import { InstructorDialog } from "./instructor-dialog";
export function CoursesContent() {
  const router = useRouter();
  const courses = useAdminCourses((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    categories: s.categories.load(),
    instructors: s.instructors.load(),
    filter: s.filter,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const [dialog, setDialog] = useState<"categories" | "instructors" | null>(
    null,
  );
  return (
    <>
      <CoursesSection
        query={courses.list}
        filter={courses.filter}
        busy={courses.busy}
        onFilter={courses.actions.setFilter}
        onPage={courses.actions.setPage}
        onRefresh={() => void courses.actions.refresh()}
        onCreate={() => router.push(adminRoutes.courseEditor("new"))}
        onArchive={(id) => void courses.actions.archive(id)}
        onCategories={() => setDialog("categories")}
        onInstructors={() => setDialog("instructors")}
      />
      <CategoryDialog
        open={dialog === "categories"}
        categories={courses.categories.data}
        busy={courses.busy}
        error={courses.error}
        onOpenChange={(open) => setDialog(open ? "categories" : null)}
        onSave={courses.actions.saveCategory}
      />
      <InstructorDialog
        open={dialog === "instructors"}
        instructors={courses.instructors.data}
        busy={courses.busy}
        error={courses.error}
        onOpenChange={(open) => setDialog(open ? "instructors" : null)}
        onSave={courses.actions.saveInstructor}
        onRemove={(id) => void courses.actions.removeInstructor(id)}
      />
    </>
  );
}
