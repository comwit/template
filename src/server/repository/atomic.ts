import "server-only";
import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb, type Database } from "@/server/db";
import { commerceRevision } from "@/server/db/schema";

export type AddStatement = (statement: BatchItem<"sqlite">) => void;
function isRevisionConflict(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if (current.message.includes("commerce_revision_valid")) return true;
    current = current.cause;
  }
  return false;
}
/**
 * Cloud is stateless: no interactive BEGIN across requests. Plan against a revision,
 * then compare-and-swap that revision and commit all statements in ONE atomic batch.
 * Every money/enrollment mutation must use this helper, including webhook/worker mutations.
 * Lesson progress heartbeats are the one exception: they upsert in a plain batch (enrollments.saveProgress).
 * The callback must only read and stage SQL; never call an external service inside it.
 */
export async function atomic<T>(
  plan: (db: Database, add: AddStatement) => Promise<T>,
): Promise<T> {
  const db = await getDb();
  for (let attempt = 0; attempt < 8; attempt++) {
    const [row] = await db
      .select()
      .from(commerceRevision)
      .where(eq(commerceRevision.id, "commerce"));
    const revision = row?.revision ?? 0;
    const statements: BatchItem<"sqlite">[] = [];
    const result = await plan(db, (statement) => {
      statements.push(statement);
    });
    if (!statements.length) return result;
    const guard = db
      .insert(commerceRevision)
      .values({ id: "commerce", revision: revision + 1 })
      .onConflictDoUpdate({
        target: commerceRevision.id,
        set: {
          revision: sql`CASE WHEN ${commerceRevision.revision} = ${revision} THEN ${revision + 1} ELSE -1 END`,
        },
      });
    try {
      await db.batch([guard, ...statements]);
      return result;
    } catch (error) {
      if (!isRevisionConflict(error) || attempt === 7) throw error;
    }
  }
  throw new Error("Commerce write contention exceeded retry budget");
}
