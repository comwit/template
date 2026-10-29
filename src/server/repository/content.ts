import "server-only";
import { atomic } from "./atomic";
import { and, asc, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { banners, notices } from "@/server/db/schema";
import type { BannerInput, ListFilter, NoticeInput } from "@/lib/course";
import { verifyUploadedImage } from "./catalog";
import { audit, ensure, offset, paginate, stamp, toDate, updated } from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

// ── 공지 ─────────────────────────────────────────────────────────
export async function findNotices(
  filter: ListFilter,
  pageable: PageRequest,
  publicOnly = false,
) {
  const db = await getDb();
  const where = and(
    isNull(notices.deletedAt),
    publicOnly
      ? eq(notices.status, "published")
      : filter.status
        ? eq(notices.status, filter.status as "draft" | "published")
        : undefined,
    filter.search ? like(notices.title, `%${filter.search}%`) : undefined,
  );
  const rows = await db
    .select()
    .from(notices)
    .where(where)
    .orderBy(desc(notices.pinned), desc(notices.publishedAt), desc(notices.createdAt))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db.select({ value: count() }).from(notices).where(where);
  return paginate(rows, total.value, pageable);
}
export async function findNotice(id: string, publicOnly = false) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(notices)
    .where(
      and(
        eq(notices.id, id),
        isNull(notices.deletedAt),
        publicOnly ? eq(notices.status, "published") : undefined,
      ),
    );
  ensure(row, "공지를 찾을 수 없습니다.", "NOT_FOUND");
  return row;
}
export async function saveNotice(input: NoticeInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    let existing: typeof notices.$inferSelect | undefined;
    if (input.id) {
      [existing] = await tx
        .select()
        .from(notices)
        .where(and(eq(notices.id, id), isNull(notices.deletedAt)));
      ensure(existing, "공지를 찾을 수 없습니다.");
    }
    const data = {
      title: input.title,
      content: input.content,
      pinned: input.pinned,
      status: input.status,
      publishedAt:
        existing?.publishedAt ??
        (input.status === "published" ? new Date() : null),
      ...updated(),
    };
    if (existing) add(tx.update(notices).set(data).where(eq(notices.id, id)));
    else add(tx.insert(notices).values({ id, ...stamp(), ...data }));
    add(audit(tx, actorId, "notice.saved", id));
    return id;
  });
}
export async function removeNotice(id: string, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const rows = await tx
      .select({ id: notices.id })
      .from(notices)
      .where(and(eq(notices.id, id), isNull(notices.deletedAt)));
    ensure(rows.length, "공지를 찾을 수 없습니다.");
    add(
      tx
        .update(notices)
        .set({ deletedAt: new Date(), ...updated() })
        .where(eq(notices.id, id)),
    );
    add(audit(tx, actorId, "notice.removed", id));
  });
}

// ── 배너 ─────────────────────────────────────────────────────────
export async function findBanners(publicOnly = false) {
  const db = await getDb();
  const now = Date.now();
  return db
    .select()
    .from(banners)
    .where(
      and(
        isNull(banners.deletedAt),
        publicOnly
          ? and(
              eq(banners.active, true),
              or(isNull(banners.startsAt), sql`${banners.startsAt} <= ${now}`),
              or(isNull(banners.endsAt), sql`${banners.endsAt} > ${now}`),
            )
          : undefined,
      ),
    )
    .orderBy(asc(banners.position), desc(banners.createdAt));
}
export async function saveBanner(input: BannerInput, actorId: string) {
  const db = await getDb();
  return atomic(async (tx, add) => {
    const id = input.id ?? uuid();
    await verifyUploadedImage(tx, input.image, "banners");
    const data = {
      title: input.title,
      image: JSON.stringify(input.image),
      linkUrl: input.linkUrl,
      position: input.position,
      active: input.active,
      startsAt: toDate(input.startsAt),
      endsAt: toDate(input.endsAt),
      ...updated(),
    };
    if (input.id) {
      const rows = await tx
        .select({ id: banners.id })
        .from(banners)
        .where(and(eq(banners.id, id), isNull(banners.deletedAt)));
      ensure(rows.length, "배너를 찾을 수 없습니다.");
      add(tx.update(banners).set(data).where(eq(banners.id, id)));
    } else add(tx.insert(banners).values({ id, ...stamp(), ...data }));
    add(audit(tx, actorId, "banner.saved", id));
    return id;
  });
}
export async function removeBanner(id: string, actorId: string) {
  const db = await getDb();
  await atomic(async (tx, add) => {
    const rows = await tx
      .select({ id: banners.id })
      .from(banners)
      .where(and(eq(banners.id, id), isNull(banners.deletedAt)));
    ensure(rows.length, "배너를 찾을 수 없습니다.");
    add(
      tx
        .update(banners)
        .set({ deletedAt: new Date(), ...updated() })
        .where(eq(banners.id, id)),
    );
    add(audit(tx, actorId, "banner.removed", id));
  });
}
