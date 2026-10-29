import { action } from "@comwit/state";
import { enrollments as api } from "@/services/app/api/enrollments";
import type { ProgressInput, ProgressResult } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class ManageActions {
    private model = state(domain);
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await Promise.all([
        this.model.list.refetch(),
        this.model.player.refetch(),
        this.model.certificates.refetch(),
      ]);
    }
    /**
     * 10초마다 불리는 하트비트라 mutate()(isSaving 게이트·토스트)를 타지 않는다.
     * 서버가 돌려준 결과로 player 데이터를 제자리에서 갱신해 목록 체크·진도율·수료증 링크가 바로 바뀐다.
     */
    async saveProgress(input: ProgressInput): Promise<ProgressResult | null> {
      try {
        const result = await api.saveProgress({
          ...input,
          positionSeconds: Math.max(0, Math.floor(input.positionSeconds)),
        });
        this.model.progress[input.lessonId] = result;
        const player = this.model.player.data;
        if (player) {
          const entry = player.progress.find((p) => p.lessonId === input.lessonId);
          if (entry) {
            entry.positionSeconds = result.positionSeconds;
            entry.completed = result.completed;
          } else {
            player.progress.push({
              lessonId: input.lessonId,
              positionSeconds: result.positionSeconds,
              completed: result.completed,
            });
          }
          player.progressPercent = result.progressPercent;
          player.completedLessons = result.completedLessons;
          player.lastLessonId = input.lessonId;
          if (result.certificateId) player.certificateId = result.certificateId;
        }
        this.model.error = null;
        return result;
      } catch (error) {
        this.model.error =
          error instanceof Error ? error.message : "진도를 저장하지 못했습니다.";
        return null;
      }
    }
  }
  return new ManageActions();
});
