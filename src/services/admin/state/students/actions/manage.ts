import { action } from "@comwit/state";
import { adminStudents } from "@/services/admin/api/students";
import { mutate } from "@/lib/course-state";
import { toast } from "@/lib/components/ui/toast";
import type { ListFilter, EnrollmentFilter, GrantInput } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain } from "../model";
export const manageActions = action<DomainActions>(({ state }) => {
  class Manage {
    private model = state(domain);
    setStudentFilter(filter: Partial<ListFilter>) {
      this.model.studentFilter = { ...this.model.studentFilter, ...filter };
      this.model.studentPage = 1;
    }
    setStudentPage(page: number) {
      this.model.studentPage = page;
    }
    setEnrollmentFilter(filter: Partial<EnrollmentFilter>) {
      this.model.enrollmentFilter = {
        ...this.model.enrollmentFilter,
        ...filter,
      };
      this.model.enrollmentPage = 1;
    }
    setEnrollmentPage(page: number) {
      this.model.enrollmentPage = page;
    }
    async refresh() {
      await Promise.all([
        this.model.students.refetch(),
        this.model.enrollments.refetch(),
      ]);
    }
    async grant(input: GrantInput) {
      let ok = false;
      await mutate(
        this.model,
        async () => {
          await adminStudents.grant({
            courseId: input.courseId,
            email: input.email.trim(),
            expiresAt: input.expiresAt?.trim() ? input.expiresAt : null,
          });
          ok = true;
          await this.refresh();
        },
        "수강 권한을 부여했습니다.",
      );
      return ok;
    }
    async revoke(enrollmentId: string, reason: string) {
      const trimmed = reason.trim();
      if (trimmed.length < 2) {
        this.model.error = "회수 사유를 2자 이상 입력해주세요.";
        toast.error(this.model.error);
        return false;
      }
      let ok = false;
      await mutate(
        this.model,
        async () => {
          await adminStudents.revoke({ enrollmentId, reason: trimmed });
          ok = true;
          await this.refresh();
        },
        "수강 권한을 회수했습니다.",
      );
      return ok;
    }
    openProgress(enrollmentId: string | null) {
      this.model.progressId = enrollmentId;
    }
    async refreshProgress() {
      await this.model.progress.refetch();
    }
  }
  return new Manage();
});
