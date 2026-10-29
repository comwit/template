"use client";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  PlayCircle,
  Wallet,
  AlertTriangle,
  RotateCcw,
  MessageCircleQuestion,
  Award,
  ArrowUpRight,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { EmptyState } from "@/lib/components/ui/empty-state";
import {
  AdminPage,
  AdminPageHeader,
  AdminSection,
  AdminSparkline,
} from "@/services/admin/_components";
import {
  StatusBadge,
  IconAction,
  MetricStrip,
} from "@/services/admin/_components/course";
import { adminRoutes } from "@/lib/admin-routes";
import type { DashboardView } from "@/lib/course";
export function DashboardSection({
  data,
  onRefresh,
}: {
  data: DashboardView;
  onRefresh(): void;
}) {
  const pills = [
    {
      label: "확인 필요",
      value: data.needsReview,
      icon: AlertTriangle,
      href: adminRoutes.payments,
      warn: data.needsReview > 0,
      title: "결제 확인이 필요한 건",
    },
    {
      label: "환불 신청 대기",
      value: data.pendingRefunds,
      icon: RotateCcw,
      href: adminRoutes.refunds,
      warn: data.pendingRefunds > 0,
      title: "심사 대기 중인 환불 신청",
    },
    {
      label: "답변 대기 질문",
      value: data.openQuestions,
      icon: MessageCircleQuestion,
      href: adminRoutes.questions,
      warn: data.openQuestions > 0,
      title: "아직 답변하지 않은 질문",
    },
    {
      label: "완강률",
      value: `${data.completionRate}%`,
      icon: Award,
      href: adminRoutes.students,
      warn: false,
      title: "전체 수강 대비 완강 비율",
    },
  ];
  const maxEnrollments = Math.max(
    1,
    ...data.topCourses.map((c) => c.enrollments),
  );
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title="운영 현황"
        action={
          <IconAction icon={RefreshCw} label="새로고침" onClick={onRefresh} />
        }
      />
      <MetricStrip
        items={[
          {
            label: "공개 강의",
            value: data.courses,
            icon: BookOpen,
            href: adminRoutes.courses,
          },
          {
            label: "수강생",
            value: data.students,
            icon: GraduationCap,
            href: adminRoutes.students,
          },
          {
            label: "수강 중",
            value: data.activeEnrollments,
            icon: PlayCircle,
            href: adminRoutes.students,
            hint: `전체 수강 ${data.enrollments.toLocaleString("ko-KR")}`,
          },
          {
            label: "순매출",
            value: data.netLabel,
            icon: Wallet,
            href: adminRoutes.payments,
            hint: `환불 ${data.refundedLabel}`,
          },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {pills.map(({ icon: Icon, ...pill }) => (
          <Link
            key={pill.label}
            href={pill.href}
            title={pill.title}
            className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-medium ${
              pill.warn
                ? "bg-warning-surface text-warning-surface-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {pill.label}{" "}
            <strong className="tabular-nums">
              {typeof pill.value === "number"
                ? pill.value.toLocaleString("ko-KR")
                : pill.value}
            </strong>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSection title="최근 6개월 매출·수강">
          {data.monthly.length ? (
            <div className="space-y-3">
              {data.monthly.length > 1 ? (
                <AdminSparkline
                  data={data.monthly.map((m) => m.sales)}
                  height={40}
                />
              ) : null}
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="text-caption text-muted-foreground">
                    <th scope="col" className="py-1 text-left font-medium">
                      월
                    </th>
                    <th scope="col" className="py-1 text-right font-medium">
                      매출
                    </th>
                    <th scope="col" className="py-1 text-right font-medium">
                      수강
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.monthly.map((m) => (
                    <tr key={m.month}>
                      <td className="py-2 tabular-nums">{m.month}</td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {m.salesLabel}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {m.enrollments.toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState className="py-8" title="아직 매출 기록이 없습니다" />
          )}
        </AdminSection>
        <AdminSection
          title="인기 강의"
          action={
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-8"
              title="강의 전체 보기"
            >
              <Link href={adminRoutes.courses} aria-label="강의 전체 보기">
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          }
        >
          {data.topCourses.length ? (
            <div className="space-y-3">
              {data.topCourses.map((c) => (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-body-sm">
                    <Link
                      href={adminRoutes.courseEditor(c.id)}
                      className="min-w-0 truncate font-medium hover:underline"
                    >
                      {c.title}
                    </Link>
                    <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                      수강 {c.enrollments.toLocaleString("ko-KR")} · 완강{" "}
                      {c.completionRate}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(c.enrollments / maxEnrollments) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              className="py-8"
              title="아직 수강 기록이 없습니다"
              action={
                <Button size="sm" asChild>
                  <Link href={adminRoutes.courses}>
                    <Plus className="size-4" />
                    강의 등록
                  </Link>
                </Button>
              }
            />
          )}
        </AdminSection>
      </div>
      <AdminSection
        title="최근 주문"
        action={
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-8"
            title="주문 전체 보기"
          >
            <Link href={adminRoutes.orders} aria-label="주문 전체 보기">
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        }
      >
        {data.recent.length ? (
          <div className="divide-y divide-border">
            {data.recent.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold">
                    {o.courseTitle}
                  </p>
                  <p className="truncate text-caption text-muted-foreground">
                    <span className="font-mono" title={o.number}>
                      {o.displayNumber}
                    </span>{" "}
                    · {o.customerEmail}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <strong className="text-body-sm tabular-nums">
                    {o.totalLabel}
                  </strong>
                  <StatusBadge
                    status={o.paymentStatus}
                    label={o.paymentLabel}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="py-8" title="아직 주문이 없습니다" />
        )}
      </AdminSection>
    </AdminPage>
  );
}
