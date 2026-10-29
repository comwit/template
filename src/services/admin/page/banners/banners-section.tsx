"use client";
import { Plus, Pencil, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import { Switch } from "@/lib/components/ui/switch";
import { EmptyState } from "@/lib/components/ui/empty-state";
import {
  AdminPage,
  AdminPageHeader,
  AdminSection,
} from "@/services/admin/_components";
import { IconAction } from "@/services/admin/_components/course";
import { courseText } from "@/lib/ui-text";
import type { BannerView } from "@/lib/course";
export function BannersSection(props: {
  banners: BannerView[];
  busy: boolean;
  onRefresh(): void;
  onCreate(): void;
  onEdit(banner: BannerView): void;
  onToggle(banner: BannerView): void;
  onRemove(id: string): void;
}) {
  return (
    <AdminPage width="5xl">
      <AdminPageHeader
        title={courseText.banners}
        action={
          <div className="flex items-center gap-2">
            <IconAction
              icon={RefreshCw}
              label={courseText.refresh}
              onClick={props.onRefresh}
            />
            <Button size="sm" onClick={props.onCreate}>
              <Plus className="size-4" aria-hidden="true" />
              배너 등록
            </Button>
          </div>
        }
      />
      <AdminSection title="노출 순서" flush>
        {props.banners.length ? (
          <div className="divide-y divide-border">
            {props.banners.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <img
                  src={b.image.thumb ?? b.image.url}
                  width={b.image.width}
                  height={b.image.height}
                  loading="lazy"
                  decoding="async"
                  alt=""
                  className="h-14 w-24 shrink-0 rounded-control bg-secondary object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-body-sm font-semibold">
                    <span className="shrink-0 rounded-pill bg-secondary px-1.5 text-micro tabular-nums text-secondary-foreground">
                      {b.position}
                    </span>
                    <span className="truncate">{b.title}</span>
                  </p>
                  <p className="truncate text-caption text-muted-foreground">
                    {b.linkUrl ? (
                      <span className="inline-flex items-center gap-1">
                        <ExternalLink className="size-3" aria-hidden="true" />
                        {b.linkUrl}
                      </span>
                    ) : (
                      "링크 없음"
                    )}
                    {b.startsLabel || b.endsLabel
                      ? ` · ${b.startsLabel ?? ""}–${b.endsLabel ?? ""}`
                      : ""}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-caption text-muted-foreground">
                  <span className="hidden sm:inline">
                    {b.active ? "노출" : "숨김"}
                  </span>
                  <Switch
                    checked={b.active}
                    disabled={props.busy}
                    onCheckedChange={() => props.onToggle(b)}
                    aria-label={`${b.title} 노출`}
                  />
                </label>
                <div className="flex shrink-0 gap-1">
                  <IconAction
                    icon={Pencil}
                    label={courseText.edit}
                    onClick={() => props.onEdit(b)}
                    disabled={props.busy}
                  />
                  <IconAction
                    icon={Trash2}
                    label="삭제"
                    onClick={() => props.onRemove(b.id)}
                    disabled={props.busy}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="m-4 py-10"
            title="등록된 배너가 없습니다"
            action={
              <Button size="sm" onClick={props.onCreate}>
                <Plus className="size-4" aria-hidden="true" />
                배너 등록
              </Button>
            }
          />
        )}
      </AdminSection>
    </AdminPage>
  );
}
