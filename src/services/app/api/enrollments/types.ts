import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface EnrollmentsAPI {
  findAll(pageable: PageRequest): Promise<Pageable<Types.EnrollmentView>>;
  player(courseId: string): Promise<Types.PlayerView>;
  saveProgress(request: Types.ProgressInput): Promise<Types.ProgressResult>;
  certificates(): Promise<Types.CertificateView[]>;
  certificate(id: string): Promise<Types.CertificateView>;
}
