"use client";
import {
  MessageSquare,
  Database,
  Images,
  CreditCard,
  CheckCircle2,
  CircleAlert,
  Truck,
  Timer,
  Store,
  Globe,
} from "lucide-react";
import { Badge } from "@/lib/components/ui/badge";
import {
  AdminPage,
  AdminPageHeader,
  AdminSection,
} from "@/services/admin/_components";
import type { SettingsView } from "@/lib/commerce";
export function SettingsSection({ settings }: { settings: SettingsView }) {
  return (
    <AdminPage width="4xl">
      <AdminPageHeader
        title="설정"
        badge={
          <Badge variant={settings.mode === "test" ? "secondary" : "success"}>
            {settings.mode === "test" ? "테스트" : "실결제"}
          </Badge>
        }
      />
      <AdminSection title="연결">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "DB", icon: Database, ready: settings.databaseReady },
            { label: "이미지", icon: Images, ready: settings.storageReady },
            { label: "토스", icon: CreditCard, ready: settings.paymentReady },
            {
              label: `SOLAPI · ${settings.notificationChannel === "alimtalk" ? "알림톡" : "문자"}`,
              icon: MessageSquare,
              ready: settings.notificationReady,
            },
          ].map(({ icon: Icon, ...item }) => (
            <div
              className="flex items-center gap-3 rounded-control bg-secondary px-3 py-3"
              key={item.label}
            >
              <Icon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-body-sm font-semibold">{item.label}</p>
                <p
                  className={
                    item.ready
                      ? "sr-only"
                      : "text-caption text-warning-surface-foreground"
                  }
                >
                  {item.ready ? "설정됨" : "설정 필요"}
                </p>
              </div>
              {item.ready ? (
                <CheckCircle2
                  className="size-4 text-success-surface-foreground"
                  aria-hidden="true"
                />
              ) : (
                <CircleAlert
                  className="size-4 text-warning-surface-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="운영">
        <dl className="grid gap-x-8 gap-y-4 text-body-sm sm:grid-cols-2">
          {[
            { label: "스토어", value: settings.name, icon: Store },
            {
              label: "배송비",
              value: settings.shippingFeeLabel ?? `${settings.shippingFee}원`,
              icon: Truck,
            },
            {
              label: "무료배송",
              value: `${settings.freeShippingThresholdLabel ?? `${settings.freeShippingThreshold}원`} 이상`,
              icon: Truck,
            },
            {
              label: "재고 예약",
              value: `${settings.reservationMinutes}분`,
              icon: Timer,
            },
          ].map(({ icon: Icon, ...item }) => (
            <div
              className="flex items-center justify-between gap-3 border-b border-border pb-3"
              key={item.label}
            >
              <dt className="flex items-center gap-2 text-soft-foreground">
                <Icon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                {item.label}
              </dt>
              <dd className="font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="mb-1 flex items-center gap-2 text-caption text-muted-foreground">
              <Globe className="size-3.5" aria-hidden="true" />
              주소
            </dt>
            <dd className="break-all">{settings.appUrl ?? "설정 필요"}</dd>
          </div>
        </dl>
      </AdminSection>
    </AdminPage>
  );
}
