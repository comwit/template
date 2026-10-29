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

// ── 운영 공통 ────────────────────────────────────────────────────
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entityId: text("entity_id").notNull(),
    detail: text("detail").notNull(),
    ...timestamps(),
  },
  (t) => [
    index("audit_entity_idx").on(t.entityId, t.createdAt),
    index("audit_actor_idx").on(t.actorId, t.createdAt),
  ],
);

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: id(),
    ownerId: text("owner_id").notNull(),
    storageKey: text("storage_key").notNull(),
    image: text("image"),
    status: text("status", { enum: ["pending", "ready", "deleted"] })
      .notNull()
      .default("pending"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("media_storage_key_uq").on(t.storageKey),
    index("media_owner_idx").on(t.ownerId, t.status, t.createdAt),
  ],
);

/** Global commerce revision: optimistic commits fail atomically when reads became stale. */
export const commerceRevision = sqliteTable(
  "commerce_revision",
  {
    id: text("id").primaryKey(),
    revision: integer("revision").notNull(),
  },
  (t) => [check("commerce_revision_valid", sql`${t.revision} >= 0`)],
);
