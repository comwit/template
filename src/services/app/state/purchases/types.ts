import type { Query } from "@comwit/state";
import type { Pageable } from "@/server/repository/types";
import type { DownloadLinkView, PurchaseView } from "@/lib/course";
export type * from "@/lib/course";
export type DomainState = {
  /** 내 구매(자료·전자책·묶음) 목록. 파일·묶음 강의가 함께 온다. */
  list: Query<Pageable<PurchaseView>, { page: number }>;
  page: number;
  isSaving: boolean;
  error: string | null;
};
export type DomainActions = {
  setPage(page: number): void;
  refresh(): Promise<void>;
  /**
   * 짧게 사는 다운로드 주소를 받아 새 탭으로 연다. 호출마다 downloadLimit 횟수를 쓰므로
   * 버튼 클릭에서만 부른다. 실패하면 null(오류는 state.error + 토스트).
   */
  downloadLink(fileId: string): Promise<DownloadLinkView | null>;
};
