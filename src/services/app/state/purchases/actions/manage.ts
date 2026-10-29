import { action } from "@comwit/state";
import { purchases as api } from "@/services/app/api/purchases";
import { mutate } from "@/lib/course-state";
import { toast } from "@/lib/components/ui/toast";
import type { DownloadLinkView } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class ManageActions {
    private model = state(domain);
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await this.model.list.refetch();
    }
    /**
     * 주소는 15분 뒤 만료되고 호출마다 횟수를 쓴다. 새 탭이 막히면(팝업 차단) 이미 쓴 횟수를 버리지 않도록
     * 현재 탭에서 연다. 끝나면 목록을 다시 받아 남은 횟수 표시(downloadsLabel)를 맞춘다.
     */
    async downloadLink(fileId: string): Promise<DownloadLinkView | null> {
      let link: DownloadLinkView | null = null;
      await mutate(this.model, async () => {
        link = await api.downloadLink(fileId);
        // features 에 noopener 를 주면 창이 열려도 null 을 돌려주므로 핸들로 opener 를 끊는다.
        const opened = window.open(link.url, "_blank");
        if (opened) opened.opener = null;
        else window.location.assign(link.url);
        toast.success(
          link.remaining === null
            ? `${link.fileName} 다운로드를 시작합니다.`
            : `${link.fileName} 다운로드를 시작합니다. 남은 횟수 ${link.remaining}회`,
        );
        await this.model.list.refetch();
      });
      return link;
    }
  }
  return new ManageActions();
});
