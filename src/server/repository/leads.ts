import "server-only";
import { type AddStatement } from "./atomic";
import { and, count, desc, eq, isNull, like, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import { leads } from "@/server/db/schema";
import type { LeadContact, ListFilter } from "@/lib/course";
import { offset, paginate, stamp, type Executor } from "./support";
import { uuid } from "./id";
import type { PageRequest } from "./types";

/** 무료 신청 주문과 같은 배치에 리드를 쌓는다. */
export function record(
  tx: Executor,
  add: AddStatement,
  contact: LeadContact,
  item: {
    userId: string | null;
    source: "free_course" | "free_product";
    courseId?: string | null;
    productId?: string | null;
    orderId?: string | null;
    itemTitle: string;
  },
) {
  const id = uuid();
  add(
    tx.insert(leads).values({
      id,
      userId: item.userId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      source: item.source,
      courseId: item.courseId ?? null,
      productId: item.productId ?? null,
      orderId: item.orderId ?? null,
      itemTitle: item.itemTitle,
      consent: contact.consent,
      ...stamp(),
    }),
  );
  return id;
}
export async function findAll(filter: ListFilter, pageable: PageRequest) {
  const db = await getDb();
  const where = and(
    isNull(leads.deletedAt),
    filter.status
      ? eq(leads.source, filter.status as typeof leads.$inferSelect.source)
      : undefined,
    filter.search
      ? or(
          like(leads.email, `%${filter.search}%`),
          like(leads.name, `%${filter.search}%`),
          like(leads.phone, `%${filter.search}%`),
          like(leads.itemTitle, `%${filter.search}%`),
        )
      : undefined,
  );
  const rows = await db
    .select()
    .from(leads)
    .where(where)
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(pageable.limit)
    .offset(offset(pageable));
  const [total] = await db.select({ value: count() }).from(leads).where(where);
  return paginate(rows, total.value, pageable);
}
