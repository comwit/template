import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./shared-schema";

// ── 공지·배너 ────────────────────────────────────────────────────
export const notices = sqliteTable(
  "notices",
  {
    id: id(),
    title: text("title").notNull(),
    /** TipTap HTML */
    content: text("content").notNull().default(""),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [index("notices_list_idx").on(t.deletedAt, t.status, t.pinned, t.publishedAt)],
);

export const banners = sqliteTable(
  "banners",
  {
    id: id(),
    title: text("title").notNull(),
    image: text("image").notNull(),
    linkUrl: text("link_url").notNull().default(""),
    position: integer("position").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [index("banners_list_idx").on(t.deletedAt, t.active, t.position)],
);
