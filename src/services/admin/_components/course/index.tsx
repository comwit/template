"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  CircleAlert,
  Truck,
  Clock3,
  RotateCcw,
  CircleX,
} from "lucide-react";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { Alert } from "@/lib/components/ui/alert";
import { Skeleton } from "@/lib/components/ui/skeleton";
import { DataTable } from "@/lib/components/ui/data-table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/lib/components/ui/select";
import { courseText } from "@/lib/ui-text";
import type { Pageable } from "@/server/repository/types";
export { DateValue, NumberValue, ReferenceValue } from "./data-values";
export type ListQuery<T> = {
  data: Pageable<T>;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: unknown;
};
export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const tone = [
    "published",
    "active",
    "paid",
    "done",
    "confirmed",
    "succeeded",
    "approved",
    "answered",
    "visible",
    "free",
    "completed",
  ].includes(status)
    ? "success"
    : [
          "failed",
          "cancelled",
          "refunded",
          "expired",
          "revoked",
          "rejected",
          "hidden",
          "archived",
        ].includes(status)
      ? "destructive"
      : [
            "unknown",
            "review",
            "pending",
            "open",
            "inactive",
            "exhausted",
            "partially_refunded",
          ].includes(status)
        ? "warning"
        : "secondary";
  const Icon =
    status === "shipped"
      ? Truck
      : ["refunded", "partially_refunded", "revoked"].includes(status)
        ? RotateCcw
        : tone === "success"
          ? CheckCircle2
          : tone === "destructive"
            ? CircleX
            : tone === "warning"
              ? CircleAlert
              : Clock3;
  return (
    <Badge variant={tone}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
export function FilterSelect({
  value,
  onChange,
  options,
  label = "상태",
}: {
  value: string;
  onChange(value: string): void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(v) => onChange(v === "all" ? "" : v)}
    >
      <SelectTrigger className="min-w-32" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{courseText.all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function CourseToolbar({
  search,
  onSearch,
  onRefresh,
  children,
}: {
  search: string;
  onSearch(value: string): void;
  onRefresh(): void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-24 flex-1 sm:max-w-64">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          className="pl-9"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={courseText.search}
          aria-label={courseText.search}
        />
      </div>
      {children}
      <IconAction
        icon={RefreshCw}
        label={courseText.refresh}
        onClick={onRefresh}
      />
    </div>
  );
}
export function CourseTable<T>({
  columns,
  query,
  onPageChange,
  toolbar,
}: {
  columns: ColumnDef<T>[];
  query: ListQuery<T>;
  onPageChange(page: number): void;
  toolbar?: ReactNode;
}) {
  const error =
    query.error instanceof Error
      ? query.error.message
      : typeof query.error === "string"
        ? query.error
        : null;
  return (
    <div className="[&_th]:h-9 [&_td]:py-2 [&>div]:shadow-none">
      <DataTable
        columns={columns}
        padRows={false}
        data={{ ...query, error }}
        onPageChange={onPageChange}
        toolbar={toolbar}
        emptyMessage={courseText.empty}
      />
    </div>
  );
}
export function QueryMessage({
  isError,
  isLoading,
  error,
  children,
  onRetry,
}: {
  isError: boolean;
  isLoading: boolean;
  error?: unknown;
  children: ReactNode;
  onRetry?(): void;
}) {
  if (isError)
    return (
      <Alert tone="destructive">
        <div className="flex items-center justify-between gap-3">
          <span>
            {error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "불러오지 못했습니다."}
          </span>
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              {courseText.retry}
            </Button>
          ) : null}
        </div>
      </Alert>
    );
  if (isLoading)
    return (
      <div
        role="status"
        aria-label={courseText.loading}
        className="space-y-4"
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  return <>{children}</>;
}

/** Compact admin actions retain accessible names and pointer tooltips. */
export function IconAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  variant = "ghost",
}: {
  icon: import("lucide-react").LucideIcon;
  label: string;
  onClick(): void;
  disabled?: boolean;
  variant?: "ghost" | "outline" | "destructive";
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={variant}
      className="size-9 shrink-0 rounded-control"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  );
}

export function MetricStrip({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    icon: import("lucide-react").LucideIcon;
    href: string;
    warning?: boolean;
    hint?: string;
  }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4">
      {items.map(({ icon: Icon, ...item }) => (
        <Link
          key={item.label}
          href={item.href}
          className="min-w-0 bg-card px-3 py-3 transition-colors hover:bg-accent focus-visible:z-raised focus-visible:outline-2 focus-visible:outline-primary sm:px-4"
          title={item.hint}
        >
          <div className="mb-1 flex items-center gap-1.5 text-caption text-muted-foreground">
            <Icon className="size-3.5" aria-hidden="true" />
            <span>{item.label}</span>
          </div>
          <p
            className={`truncate text-title-lg font-bold tabular-nums sm:text-display-sm ${item.warning ? "text-destructive-surface-foreground" : "text-foreground"}`}
          >
            {typeof item.value === "number"
              ? item.value.toLocaleString("ko-KR")
              : item.value}
          </p>
        </Link>
      ))}
    </div>
  );
}
