import { model, query, keepPreviousData } from "@comwit/state";
import { adminCourses } from "@/services/admin/api/courses";
import {
  emptyPage,
  type CourseInput,
  type CourseSummary,
  type CourseView,
  type CategoryView,
  type InstructorView,
} from "@/lib/course";
import type { Pageable } from "@/server/repository/types";
import type { DomainState, ListArgs } from "./types";
export const freshDraft = (): CourseInput => ({
  title: "",
  slug: "",
  categoryId: null,
  instructorId: null,
  summary: "",
  description: "",
  thumbnail: null,
  level: "beginner",
  price: 0,
  discountPrice: null,
  discountEndsAt: null,
  status: "draft",
  sections: [],
});
/** ISO → KST 기준 datetime-local 입력값(YYYY-MM-DDTHH:mm) */
const toLocalInput = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
};
/** 상세 응답을 편집 초안으로 되돌린다. 만료된 할인도 그대로 보여 관리자가 고치게 둔다. */
export const toDraft = (course: CourseView): CourseInput => ({
  id: course.id,
  title: course.title,
  slug: course.slug,
  categoryId: course.categoryId,
  instructorId: course.instructorId,
  summary: course.summary,
  description: course.description,
  thumbnail: course.thumbnail,
  level: course.level,
  price: course.price,
  discountPrice: course.discountPrice,
  discountEndsAt: toLocalInput(course.discountEndsAt),
  status: course.status,
  sections: course.sections.map((s) => ({
    id: s.id,
    title: s.title,
    lessons: s.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      video: l.video ? { provider: l.video.provider, url: l.video.url } : null,
      durationSeconds: l.durationSeconds,
      isPreview: l.isPreview,
      content: l.content,
    })),
  })),
});
export const domain = model<DomainState>({
  list: query<Pageable<CourseSummary>, ListArgs>({
    initialData: emptyPage<CourseSummary>(),
    queryFn: (args) => adminCourses.findAll(args.filter, args.pageable),
    placeholderData: keepPreviousData,
  }),
  detail: query<CourseView | null, string>({
    initialData: null,
    queryFn: (id) => adminCourses.find(id),
  }),
  categories: query<CategoryView[]>({
    initialData: [],
    queryFn: () => adminCourses.categories(),
  }),
  instructors: query<InstructorView[]>({
    initialData: [],
    queryFn: () => adminCourses.instructors(),
  }),
  filter: { search: "", status: "" },
  page: 1,
  draft: freshDraft(),
  editingId: null,
  isSaving: false,
  error: null,
});
