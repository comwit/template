import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { enrollments } from "./actions/enrollments";
import { grant } from "./actions/grant";
import { revoke } from "./actions/revoke";
import { progress } from "./actions/progress";
export const adminStudents = resolveActions({ findAll, enrollments, grant, revoke, progress });
