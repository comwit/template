import type { AdminMediaAPI } from "@/services/admin/api/media";
import { mockApi } from "../runtime";
export const adminMedia = {
  prepare: mockApi<AdminMediaAPI["prepare"]>(() => {
    throw new Error(
      "스토리북에서는 업로드할 수 없습니다. 이미지가 있는 시안은 예시 ImageAsset을 지정해주세요.",
    );
  }),
  complete: mockApi<AdminMediaAPI["complete"]>(() => {
    throw new Error("스토리북에서는 업로드할 수 없습니다.");
  }),
} satisfies AdminMediaAPI;
