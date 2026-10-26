"use client";
import Link from "next/link";
import {
  Package,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  Boxes,
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
} from "@/services/admin/_components";
import {
  StatusBadge,
  IconAction,
  MetricStrip,
} from "@/services/admin/_components/commerce";
import { adminRoutes } from "@/lib/admin-routes";
import type { DashboardView } from "@/lib/commerce";
export function DashboardSection({
  data,
  onRefresh,
}: {
  data: DashboardView;
  onRefresh(): void;
}) {
  return (
    <AdminPage width="6xl">
      <AdminPageHeader
        title="스토어 현황"
        action={
          <IconAction icon={RefreshCw} label="새로고침" onClick={onRefresh} />
        }
      />
      <MetricStrip
        items={[
          {
            label: "상품",
            value: data.products,
            icon: Package,
            href: adminRoutes.products,
          },
          {
            label: "주문",
            value: data.orders,
            icon: ShoppingBag,
            href: adminRoutes.orders,
          },
          {
            label: "순결제액",
            value: data.netLabel,
            icon: Wallet,
            href: adminRoutes.payments,
            hint: `환불 ${data.refundedLabel}`,
          },
          {
            label: "확인 필요",
            value: data.needsReview,
            icon: AlertTriangle,
            href: adminRoutes.payments,
            warning: data.needsReview > 0,
          },
        ]}
      />
      <AdminSection
        title="최근 주문"
        action={
          <div className="flex items-center gap-2">
            <Link
              href={adminRoutes.inventory}
              title="판매 가능 재고 5개 이하"
              className="flex items-center gap-1.5 rounded-pill bg-warning-surface px-2.5 py-1 text-caption font-medium text-warning-surface-foreground"
            >
              <Boxes className="size-3.5" aria-hidden="true" />
              재고 부족 <strong>{data.lowStock}</strong>
            </Link>
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
          </div>
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
                  <p
                    className="truncate text-body-sm font-semibold"
                    title={o.number}
                  >
                    {o.displayNumber ?? o.number}
                  </p>
                  <p className="truncate text-caption text-muted-foreground">
                    {o.customerEmail}
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
          <EmptyState
            className="py-8"
            title="아직 주문이 없습니다"
            action={
              <Button size="sm" asChild>
                <Link href={adminRoutes.products}>
                  <Plus className="size-4" />
                  상품 등록
                </Link>
              </Button>
            }
          />
        )}
      </AdminSection>
    </AdminPage>
  );
}
