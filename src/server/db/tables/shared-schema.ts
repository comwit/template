import { integer, text } from "drizzle-orm/sqlite-core";

/** 모든 도메인 테이블이 공유하는 열. 새 테이블도 이 두 헬퍼로 시작한다. */
export const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});
export const id = () => text("id").primaryKey();
