import type { Query } from "@comwit/state";
import type { Pageable } from "@/server/repository/types";
import type {
  EnrollmentView,
  PlayerView,
  CertificateView,
  ProgressInput,
  ProgressResult,
} from "@/lib/course";
export type * from "@/lib/course";
export type DomainState = {
  list: Query<Pageable<EnrollmentView>, { page: number }>;
  page: number;
  player: Query<PlayerView | null, string>;
  certificates: Query<CertificateView[]>;
  certificate: Query<CertificateView | null, string>;
  /** 마지막 저장 결과(레슨별). 플레이어가 진도율 반영 뒤 참고용으로 둔다. */
  progress: Record<string, ProgressResult>;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setPage(page: number): void;
  refresh(): Promise<void>;
  /** 재생 위치 저장. 서버 결과로 player 데이터를 제자리에서 갱신한다. 실패하면 null(토스트 없음). */
  saveProgress(input: ProgressInput): Promise<ProgressResult | null>;
};
