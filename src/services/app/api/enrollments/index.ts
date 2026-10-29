import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { player } from "./actions/player";
import { saveProgress } from "./actions/save-progress";
import { certificates } from "./actions/certificates";
import { certificate } from "./actions/certificate";
export const enrollments = resolveActions({ findAll, player, saveProgress, certificates, certificate });
