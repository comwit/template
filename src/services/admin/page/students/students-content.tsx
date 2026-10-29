"use client";
import { useState } from "react";
import { Plus, FileDown } from "lucide-react";
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
  type PurchaseView,
} from "@/services/admin/state/students";
import { courseText } from "@/lib/ui-text";
import { StudentsTable } from "./students-table";
import { EnrollmentsTable } from "./enrollments-table";
import { PurchasesTable } from "./purchases-table";
import { GrantDialog } from "./grant-dialog";
import { GrantPurchaseDialog } from "./grant-purchase-dialog";
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
    purchases: s.purchases.load({
      filter: s.purchaseFilter,
      pageable: { page: s.purchasePage, limit: 20 },
    }),
    courses: s.courses.load(),
    products: s.products.load(),
    progress: s.progressId ? s.progress.load(s.progressId) : s.progress,
    progressId: s.progressId,
    studentFilter: s.studentFilter,
    enrollmentFilter: s.enrollmentFilter,
    purchaseFilter: s.purchaseFilter,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  const [tab, setTab] = useState("students");
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantPurchaseOpen, setGrantPurchaseOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<EnrollmentView | null>(null);
  const [revokePurchaseTarget, setRevokePurchaseTarget] =
    useState<PurchaseView | null>(null);
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title={courseText.students}
        action={
          tab === "purchases" ? (
            <Button onClick={() => setGrantPurchaseOpen(true)}>
              <FileDown className="size-4" aria-hidden="true" />
              구매 권한 부여
            </Button>
          ) : (
            <Button onClick={() => setGrantOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              수강 권한 부여
            </Button>
          )
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="students">회원</TabsTrigger>
          <TabsTrigger value="enrollments">수강</TabsTrigger>
          <TabsTrigger value="purchases">구매</TabsTrigger>
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
        <TabsContent value="purchases">
          <PurchasesTable
            query={students.purchases}
            filter={students.purchaseFilter}
            products={students.products.data}
            busy={students.busy}
            onFilter={students.actions.setPurchaseFilter}
            onPage={students.actions.setPurchasePage}
            onRefresh={() => void students.actions.refresh()}
            onRevoke={setRevokePurchaseTarget}
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
      <GrantPurchaseDialog
        open={grantPurchaseOpen}
        products={students.products.data}
        busy={students.busy}
        error={students.error}
        onOpenChange={setGrantPurchaseOpen}
        onGrant={students.actions.grantPurchase}
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
      <AdminReasonDialog
        open={Boolean(revokePurchaseTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokePurchaseTarget(null);
        }}
        title="구매 권한을 회수할까요?"
        description="구매자는 더 이상 파일을 내려받거나 묶음 강의에 들어갈 수 없습니다. 결제는 환불되지 않습니다."
        targetLabel={
          revokePurchaseTarget
            ? `${revokePurchaseTarget.userEmail} · ${revokePurchaseTarget.productTitle}`
            : undefined
        }
        reasonPlaceholder="회수 사유 (2자 이상)"
        confirmLabel="회수"
        submitting={students.busy}
        onConfirm={async (reason) => {
          if (!revokePurchaseTarget) return;
          const ok = await students.actions.revokePurchase(
            revokePurchaseTarget.id,
            reason ?? "",
          );
          if (ok) setRevokePurchaseTarget(null);
        }}
      />
    </AdminPage>
  );
}
