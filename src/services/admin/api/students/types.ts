import type * as Types from "@/lib/course";
import type { PageRequest, Pageable } from "@/server/repository/types";
export type * from "@/lib/course";
export interface AdminStudentsAPI {
  findAll(filter: Types.ListFilter, pageable: PageRequest): Promise<Pageable<Types.StudentView>>;
  enrollments(filter: Types.EnrollmentFilter, pageable: PageRequest): Promise<Pageable<Types.EnrollmentView>>;
  grant(request: Types.GrantInput): Promise<string>;
  revoke(request: Types.RevokeInput): Promise<void>;
  progress(enrollmentId: string): Promise<Types.ProgressDetailView[]>;
  purchases(filter: Types.EnrollmentFilter, pageable: PageRequest): Promise<Pageable<Types.PurchaseView>>;
  grantPurchase(request: Types.GrantPurchaseInput): Promise<string>;
  revokePurchase(request: Types.RevokePurchaseInput): Promise<void>;
}
