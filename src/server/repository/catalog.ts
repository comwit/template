import "server-only";
import { atomic } from "./atomic";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { config } from "@/server/config";
import { getDb } from "@/server/db";
import {
  categories,
  courses,
  instructors,
  lessons,
  mediaAssets,
  sections,
} from "@/server/db/schema";
import type {
  CategoryInput,
  CourseFilter,
  CourseInput,
  InstructorInput,
  ListFilter,
} from "@/lib/course";
import {
  audit,
  ensure,
  offset,
  paginate,
  stamp,
  toDate,
  updated,
  type Executor,
} from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

export type CourseRow = typeof courses.$inferSelect & {
  category: typeof categories.$inferSelect | null;
  instructor: typeof instructors.$inferSelect | null;
};
export type CurriculumRow = typeof sections.$inferSelect & {
  lessons: (typeof lessons.$inferSelect)[];
};

const courseSelect = {
  course: courses,
  category: categories,
  instructor: instructors,
} as const;
function withRelations(
  rows: { course: typeof courses.$inferSelect; category: typeof categories.$inferSelect | null; instructor: typeof instructors.$inferSelect | null }[],
): CourseRow[] {
  return rows.map((r) => ({
    ...r.course,
    category: r.category,
    instructor: r.instructor,
  }));
}

/** 관리자 목록 */
export async function findAll(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(courses.deletedAt),
    filter.status
      ? eq(courses.status, filter.status as CourseInput["status"])
      : undefined,
    filter.search
      ? or(
          like(courses.title, `%${filter.search}%`),
          like(courses.slug, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select(courseSelect)
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .leftJoin(instructors, eq(instructors.id, courses.instructorId))
    .where(where)
    .orderBy(desc(courses.createdAt), desc(courses.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(courses)
    .where(where);
  return paginate(withRelations(rows), total.value, pageable);
}

/** 공개 목록: 카테고리·검색·정렬 */
export async function findPublic(filter: CourseFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(courses.deletedAt),
    eq(courses.status, "published"),
    filter.category ? eq(categories.slug, filter.category) : undefined,
    filter.level
      ? eq(courses.level, filter.level as CourseInput["level"])
      : undefined,
    filter.search
      ? or(
          like(courses.title, `%${filter.search}%`),
          like(courses.summary, `%${filter.search}%`),
        )
      : undefined,
  );
  const effectivePrice = sql<number>`CASE WHEN ${courses.discountPrice} IS NOT NULL AND (${courses.discountEndsAt} IS NULL OR ${courses.discountEndsAt} > ${Date.now()}) THEN ${courses.discountPrice} ELSE ${courses.price} END`;
  const order: Record<CourseFilter["sort"], SQL[]> = {
    latest: [desc(courses.publishedAt), desc(courses.id)],
    popular: [desc(courses.enrollmentCount), desc(courses.publishedAt)],
    rating: [
      desc(
        sql`CASE WHEN ${courses.reviewCount} = 0 THEN 0 ELSE ${courses.ratingSum} * 1.0 / ${courses.reviewCount} END`,
      ),
      desc(courses.reviewCount),
    ],
    price_asc: [asc(effectivePrice), desc(courses.publishedAt)],
    price_desc: [desc(effectivePrice), desc(courses.publishedAt)],
  };
  const rows = await db
    .select(courseSelect)
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .leftJoin(instructors, eq(instructors.id, courses.instructorId))
    .where(where)
    .orderBy(...order[filter.sort])
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db
    .select({ value: count() })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .where(where);
  return paginate(withRelations(rows), total.value, pageable);
}

export async function findById(id: string, publicOnly = false) {
  const db = await getDb();
  const [row] = await db
    .select(courseSelect)
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .leftJoin(instructors, eq(instructors.id, courses.instructorId))
    .where(
      and(
        eq(courses.id, id),
        isNull(courses.deletedAt),
        publicOnly ? eq(courses.status, "published") : undefined,
      ),
    );
  ensure(row, "강의를 찾을 수 없습니다.", "NOT_FOUND");
  const [course] = withRelations([row]);
  return { ...course, sections: await findCurriculum(db, id) };
}

export async function findCurriculum(
  db: Executor,
  courseId: string,
): Promise<CurriculumRow[]> {
  const [sectionRows, lessonRows] = await Promise.all([
    db
      .select()
      .from(sections)
      .where(and(eq(sections.courseId, courseId), isNull(sections.deletedAt)))
      .orderBy(asc(sections.position), asc(sections.createdAt)),
    db
      .select()
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), isNull(lessons.deletedAt)))
      .orderBy(asc(lessons.position), asc(lessons.createdAt)),
  ]);
  return sectionRows.map((s) => ({
    ...s,
    lessons: lessonRows.filter((l) => l.sectionId === s.id),
  }));
}

export async function findLessonIds(db: Executor, courseId: string) {
  return (
    await db
      .select({ id: lessons.id, durationSeconds: lessons.durationSeconds })
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), isNull(lessons.deletedAt)))
  );
}

async function ensureUploadedImage(
  tx: Executor,
  image: { url: string } | null,
  folder: string,
) {
  if (!image) return;
  const base = config.COMWIT_STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, "");
  ensure(
    base && image.url.startsWith(`${base}/${folder}/`),
    "업로드한 이미지만 사용할 수 있습니다.",
  );
  const key = decodeURIComponent(image.url.slice(base.length + 1));
  const [asset] = await tx
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.storageKey, key),
        eq(mediaAssets.status, "ready"),
        isNull(mediaAssets.deletedAt),
      ),
    );
  ensure(asset?.image === JSON.stringify(image), "검증이 완료된 이미지를 선택해주세요.");
}
export const verifyUploadedImage = ensureUploadedImage;

/** 강의·섹션·레슨을 한 번에 저장한다. 빠진 섹션·레슨은 소프트 삭제한다. */
export async function save(input: CourseInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    let existing: typeof courses.$inferSelect | undefined;
    if (input.id) {
      [existing] = await tx
        .select()
        .from(courses)
        .where(and(eq(courses.id, id), isNull(courses.deletedAt)));
      ensure(existing, "강의를 찾을 수 없습니다.");
    }
    if (input.categoryId) {
      const [category] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(eq(categories.id, input.categoryId), isNull(categories.deletedAt)),
        );
      ensure(category, "유효한 카테고리를 선택해주세요.");
    }
    if (input.instructorId) {
      const [instructor] = await tx
        .select({ id: instructors.id })
        .from(instructors)
        .where(
          and(
            eq(instructors.id, input.instructorId),
            isNull(instructors.deletedAt),
          ),
        );
      ensure(instructor, "유효한 강사를 선택해주세요.");
    }
    await ensureUploadedImage(tx, input.thumbnail, "courses");
    const [duplicate] = await tx
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, input.slug));
    ensure(!duplicate || duplicate.id === id, "이미 사용 중인 강의 주소입니다.");

    const allLessons = input.sections.flatMap((s) => s.lessons);
    const data = {
      title: input.title,
      slug: input.slug,
      categoryId: input.categoryId,
      instructorId: input.instructorId,
      summary: input.summary,
      description: input.description,
      thumbnail: input.thumbnail ? JSON.stringify(input.thumbnail) : null,
      level: input.level,
      price: input.price,
      discountPrice: input.discountPrice,
      discountEndsAt: toDate(input.discountEndsAt),
      status: input.status,
      lessonCount: allLessons.length,
      totalDurationSeconds: allLessons.reduce(
        (sum, l) => sum + l.durationSeconds,
        0,
      ),
      publishedAt:
        existing?.publishedAt ??
        (input.status === "published" ? new Date() : null),
      ...updated(),
    };
    if (existing) add(tx.update(courses).set(data).where(eq(courses.id, id)));
    else add(tx.insert(courses).values({ id, ...stamp(), ...data }));

    const previousSections = existing
      ? await tx
          .select()
          .from(sections)
          .where(and(eq(sections.courseId, id), isNull(sections.deletedAt)))
      : [];
    const previousLessons = existing
      ? await tx
          .select()
          .from(lessons)
          .where(and(eq(lessons.courseId, id), isNull(lessons.deletedAt)))
      : [];
    const keptSections = new Set<string>();
    const keptLessons = new Set<string>();
    input.sections.forEach((section, sectionIndex) => {
      const sectionId = section.id ?? uuid();
      if (section.id)
        ensure(
          previousSections.some((s) => s.id === section.id),
          "이 강의의 섹션만 수정할 수 있습니다.",
        );
      keptSections.add(sectionId);
      const sectionData = {
        courseId: id,
        title: section.title,
        position: sectionIndex,
        ...updated(),
      };
      if (section.id)
        add(tx.update(sections).set(sectionData).where(eq(sections.id, sectionId)));
      else add(tx.insert(sections).values({ id: sectionId, ...stamp(), ...sectionData }));
      section.lessons.forEach((lesson, lessonIndex) => {
        const lessonId = lesson.id ?? uuid();
        if (lesson.id)
          ensure(
            previousLessons.some((l) => l.id === lesson.id),
            "이 강의의 레슨만 수정할 수 있습니다.",
          );
        keptLessons.add(lessonId);
        const lessonData = {
          courseId: id,
          sectionId,
          title: lesson.title,
          position: sectionIndex * 1000 + lessonIndex,
          video: lesson.video ? JSON.stringify(lesson.video) : null,
          durationSeconds: lesson.durationSeconds,
          isPreview: lesson.isPreview,
          content: lesson.content,
          ...updated(),
        };
        if (lesson.id)
          add(tx.update(lessons).set(lessonData).where(eq(lessons.id, lessonId)));
        else add(tx.insert(lessons).values({ id: lessonId, ...stamp(), ...lessonData }));
      });
    });
    const removedSections = previousSections
      .filter((s) => !keptSections.has(s.id))
      .map((s) => s.id);
    const removedLessons = previousLessons
      .filter((l) => !keptLessons.has(l.id))
      .map((l) => l.id);
    if (removedSections.length)
      add(
        tx
          .update(sections)
          .set({ deletedAt: new Date(), ...updated() })
          .where(inArray(sections.id, removedSections)),
      );
    if (removedLessons.length)
      add(
        tx
          .update(lessons)
          .set({ deletedAt: new Date(), ...updated() })
          .where(inArray(lessons.id, removedLessons)),
      );
    add(audit(tx, actorId, existing ? "course.updated" : "course.created", id));
    return id;
  });
}

export async function archive(id: string, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const changed = await tx
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, id), isNull(courses.deletedAt)));
    add(
      tx
        .update(courses)
        .set({ status: "archived", ...updated() })
        .where(eq(courses.id, id)),
    );
    ensure(changed.length, "강의를 찾을 수 없습니다.");
    add(audit(tx, actorId, "course.archived", id));
  });
}

// ── 카테고리 ─────────────────────────────────────────────────────
export async function findCategories() {
  const db = await getDb();
  return db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.name));
}
export async function saveCategory(input: CategoryInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    const [duplicate] = await tx
      .select()
      .from(categories)
      .where(eq(categories.slug, input.slug));
    ensure(!duplicate || duplicate.id === id, "이미 사용 중인 카테고리 주소입니다.");
    if (input.id) {
      const rows = await tx
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), isNull(categories.deletedAt)));
      add(
        tx
          .update(categories)
          .set({ name: input.name, slug: input.slug, ...updated() })
          .where(eq(categories.id, id)),
      );
      ensure(rows.length, "카테고리를 찾을 수 없습니다.");
    } else
      add(
        tx
          .insert(categories)
          .values({ id, name: input.name, slug: input.slug, ...stamp() }),
      );
    add(audit(tx, actorId, "category.saved", id));
    return id;
  });
}

// ── 강사 ─────────────────────────────────────────────────────────
export async function findInstructors() {
  const db = await getDb();
  const rows = await db
    .select({ instructor: instructors, courseCount: count(courses.id) })
    .from(instructors)
    .leftJoin(
      courses,
      and(eq(courses.instructorId, instructors.id), isNull(courses.deletedAt)),
    )
    .where(isNull(instructors.deletedAt))
    .groupBy(instructors.id)
    .orderBy(asc(instructors.name));
  return rows.map((r) => ({ ...r.instructor, courseCount: r.courseCount }));
}
export async function saveInstructor(input: InstructorInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    await ensureUploadedImage(tx, input.image, "instructors");
    const data = {
      name: input.name,
      title: input.title,
      bio: input.bio,
      image: input.image ? JSON.stringify(input.image) : null,
      ...updated(),
    };
    if (input.id) {
      const rows = await tx
        .select({ id: instructors.id })
        .from(instructors)
        .where(and(eq(instructors.id, id), isNull(instructors.deletedAt)));
      add(tx.update(instructors).set(data).where(eq(instructors.id, id)));
      ensure(rows.length, "강사를 찾을 수 없습니다.");
    } else add(tx.insert(instructors).values({ id, ...stamp(), ...data }));
    add(audit(tx, actorId, "instructor.saved", id));
    return id;
  });
}
export async function removeInstructor(id: string, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const used = await tx
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.instructorId, id), isNull(courses.deletedAt)))
      .limit(1);
    ensure(!used.length, "강의에 연결된 강사는 삭제할 수 없습니다. 강의에서 먼저 해제해주세요.");
    add(
      tx
        .update(instructors)
        .set({ deletedAt: new Date(), ...updated() })
        .where(eq(instructors.id, id)),
    );
    add(audit(tx, actorId, "instructor.removed", id));
  });
}
