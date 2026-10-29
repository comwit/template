"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/lib/components/ui/tabs";
import {
  AdminPage,
  AdminPageHeader,
  AdminReasonDialog,
} from "@/services/admin/_components";
import {
  useAdminStudents,
  type EnrollmentView,
} from "@/services/admin/state/students";
import { courseText } from "@/lib/ui-text";
import { StudentsTable } from "./students-table";
import { EnrollmentsTable } from "./enrollments-table";
import { GrantDialog } from "./grant-dialog";
import { ProgressDialog } from "./progress-dialog";
export function StudentsContent() {
  const students = useAdminStudents((s) => ({
    students: s.students.load({
      filter: s.studentFilter,
      pageable: { page: s.studentPage, limit: 20 },
    }),
    enrollments: s.enrollments.load({
      filter: s.enrollmentFilter,
      pageable: { page: s.enrollmentPage, limit: 20 },
    }),
    courses: s.courses.load(),
    progress: s.progressId ? s.progress.load(s.progressId) : s.progress,
    progressId: s.progressId,
    studentFilter: s.studentFilter,
    enrollmentFilter: s.enrollmentFilter,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<EnrollmentView | null>(null);
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.students}
        action={
          <Button onClick={() => setGrantOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            수강 권한 부여
          </Button>
        }
      />
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">회원</TabsTrigger>
          <TabsTrigger value="enrollments">수강</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <StudentsTable
            query={students.students}
            filter={students.studentFilter}
            onFilter={students.actions.setStudentFilter}
            onPage={students.actions.setStudentPage}
            onRefresh={() => void students.actions.refresh()}
          />
        </TabsContent>
        <TabsContent value="enrollments">
          <EnrollmentsTable
            query={students.enrollments}
            filter={students.enrollmentFilter}
            courses={students.courses.data}
            busy={students.busy}
            onFilter={students.actions.setEnrollmentFilter}
            onPage={students.actions.setEnrollmentPage}
            onRefresh={() => void students.actions.refresh()}
            onProgress={students.actions.openProgress}
            onRevoke={setRevokeTarget}
          />
        </TabsContent>
      </Tabs>
      <GrantDialog
        open={grantOpen}
        courses={students.courses.data}
        busy={students.busy}
        error={students.error}
        onOpenChange={setGrantOpen}
        onGrant={students.actions.grant}
      />
      <ProgressDialog
        open={Boolean(students.progressId)}
        query={students.progress}
        onOpenChange={(open) => {
          if (!open) students.actions.openProgress(null);
        }}
        onRetry={() => void students.actions.refreshProgress()}
      />
      <AdminReasonDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="수강 권한을 회수할까요?"
        description="수강생은 더 이상 강의실에 들어갈 수 없습니다. 결제는 환불되지 않습니다."
        targetLabel={
          revokeTarget
            ? `${revokeTarget.userEmail} · ${revokeTarget.courseTitle}`
            : undefined
        }
        reasonPlaceholder="회수 사유 (2자 이상)"
        confirmLabel="회수"
        submitting={students.busy}
        onConfirm={async (reason) => {
          if (!revokeTarget) return;
          const ok = await students.actions.revoke(revokeTarget.id, reason ?? "");
          if (ok) setRevokeTarget(null);
        }}
      />
    </AdminPage>
  );
}
