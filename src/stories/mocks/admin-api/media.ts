import type { AdminMediaAPI } from "@/services/admin/api/media";
import { mockApi } from "../runtime";
export const adminMedia = {
  prepare: mockApi<AdminMediaAPI["prepare"]>(() => {
    throw new Error(
      "스토리북에서는 실제 파일을 업로드하지 않습니다. 이미지가 있는 시안은 예시 ImageAsset을 지정해주세요.",
    );
  }),
  complete: mockApi<AdminMediaAPI["complete"]>(() => {
    throw new Error("스토리북 파일 업로드는 연결하지 않았습니다.");
  }),
} satisfies AdminMediaAPI;
