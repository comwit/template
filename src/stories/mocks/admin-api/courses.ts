import type { AdminCoursesAPI } from "@/services/admin/api/courses";
import {
  formatDuration,
  formatMoney,
  formatRating,
  youtubeVideoId,
  type CourseView,
  type SectionView,
} from "@/lib/course";
import { STORY_NOW, findItem, list, mockApi } from "../runtime";
import { dateLabel, nowLabel, statusLabel } from "../labels";
export const adminCourses = {
  findAll: mockApi<AdminCoursesAPI["findAll"]>((db, filter, page) =>
    list(db.courses, filter, page),
  ),
  find: mockApi<AdminCoursesAPI["find"]>((db, id) => {
    const found = findItem(db.courses, id);
    // 관리자 편집 화면은 모든 레슨의 영상·자료를 본다.
    return { ...found, sections: db.player.course.id === found.id ? db.player.sections : found.sections };
  }),
  save: mockApi<AdminCoursesAPI["save"]>((db, input) => {
    const id = input.id ?? crypto.randomUUID();
    const previous = db.courses.find((item) => item.id === id);
    const sections: SectionView[] = input.sections.map((section, sIndex) => {
      const sectionId = section.id ?? crypto.randomUUID();
      const lessons = section.lessons.map((lessonInput, lIndex) => ({
        id: lessonInput.id ?? crypto.randomUUID(),
        sectionId,
        title: lessonInput.title,
        position: lIndex,
        video: lessonInput.video
          ? {
              ...lessonInput.video,
              embedId:
                lessonInput.video.provider === "youtube"
                  ? youtubeVideoId(lessonInput.video.url)
                  : null,
            }
          : null,
        hasVideo: Boolean(lessonInput.video),
        durationSeconds: lessonInput.durationSeconds,
        durationLabel: formatDuration(lessonInput.durationSeconds),
        isPreview: lessonInput.isPreview,
        content: lessonInput.content,
      }));
      const durationSeconds = lessons.reduce((s, l) => s + l.durationSeconds, 0);
      return {
        id: sectionId,
        title: section.title,
        position: sIndex,
        durationSeconds,
        durationLabel: formatDuration(durationSeconds),
        lessons,
      };
    });
    const lessons = sections.flatMap((s) => s.lessons);
    const totalDurationSeconds = lessons.reduce((s, l) => s + l.durationSeconds, 0);
    const discounting =
      input.discountPrice !== null &&
      (!input.discountEndsAt || new Date(input.discountEndsAt) > STORY_NOW);
    const sale = discounting ? (input.discountPrice as number) : input.price;
    const reviewCount = previous?.reviewCount ?? 0;
    const rating = previous?.rating ?? null;
    const course: CourseView = {
      id,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      thumbnail: input.thumbnail,
      categoryId: input.categoryId,
      categoryName:
        db.categories.find((c) => c.id === input.categoryId)?.name ?? null,
      instructorId: input.instructorId,
      instructorName:
        db.instructors.find((i) => i.id === input.instructorId)?.name ?? null,
      level: input.level,
      levelLabel: statusLabel(input.level),
      status: input.status,
      statusLabel: statusLabel(input.status),
      price: input.price,
      discountPrice: input.discountPrice,
      salePrice: sale,
      priceLabel: formatMoney(sale),
      originalPriceLabel: discounting ? formatMoney(input.price) : null,
      discountRate: discounting
        ? Math.round(((input.price - sale) / input.price) * 100)
        : 0,
      discountEndsLabel: discounting ? dateLabel(input.discountEndsAt) : null,
      discountEndsAt: input.discountEndsAt,
      isFree: sale === 0,
      lessonCount: lessons.length,
      totalDurationSeconds,
      totalDurationLabel: formatDuration(totalDurationSeconds),
      enrollmentCount: previous?.enrollmentCount ?? 0,
      rating,
      ratingLabel: formatRating((rating ?? 0) * reviewCount, reviewCount),
      reviewCount,
      createdLabel: previous?.createdLabel ?? nowLabel(),
      publishedLabel:
        input.status === "published"
          ? (previous?.publishedLabel ?? nowLabel())
          : (previous?.publishedLabel ?? null),
      description: input.description,
      instructor:
        db.instructors.find((i) => i.id === input.instructorId) ?? null,
      sections,
      enrollment: previous?.enrollment ?? null,
    };
    if (previous) Object.assign(previous, course);
    else db.courses.unshift(course);
    if (db.player.course.id === id)
      Object.assign(db.player, {
        course: { id, title: course.title, slug: course.slug },
        sections,
        lessonCount: lessons.length,
      });
    return id;
  }),
  archive: mockApi<AdminCoursesAPI["archive"]>((db, id) => {
    Object.assign(findItem(db.courses, id), {
      status: "archived",
      statusLabel: statusLabel("archived"),
    });
  }),
  categories: mockApi<AdminCoursesAPI["categories"]>((db) => db.categories),
  saveCategory: mockApi<AdminCoursesAPI["saveCategory"]>((db, input) => {
    const category = { ...input, id: input.id ?? crypto.randomUUID() };
    const previous = db.categories.find((item) => item.id === category.id);
    if (previous) Object.assign(previous, category);
    else db.categories.push(category);
    db.courses
      .filter((c) => c.categoryId === category.id)
      .forEach((c) => (c.categoryName = category.name));
    return category.id;
  }),
  instructors: mockApi<AdminCoursesAPI["instructors"]>((db) =>
    db.instructors.map((item) => ({
      ...item,
      courseCount: db.courses.filter((c) => c.instructorId === item.id).length,
    })),
  ),
  saveInstructor: mockApi<AdminCoursesAPI["saveInstructor"]>((db, input) => {
    const instructor = { ...input, id: input.id ?? crypto.randomUUID() };
    const previous = db.instructors.find((item) => item.id === instructor.id);
    if (previous) Object.assign(previous, instructor);
    else db.instructors.push(instructor);
    db.courses
      .filter((c) => c.instructorId === instructor.id)
      .forEach((c) => {
        c.instructorName = instructor.name;
        c.instructor = { ...instructor };
      });
    return instructor.id;
  }),
  removeInstructor: mockApi<AdminCoursesAPI["removeInstructor"]>((db, id) => {
    if (db.courses.some((c) => c.instructorId === id))
      throw new Error("강의에 연결된 강사는 삭제할 수 없습니다.");
    db.instructors = db.instructors.filter((item) => item.id !== id);
  }),
} satisfies AdminCoursesAPI;
