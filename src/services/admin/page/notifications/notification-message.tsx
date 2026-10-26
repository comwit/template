"use client";

import { MessageSquareText } from "lucide-react";
import { Button } from "@/lib/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/lib/components/ui/popover";
import { Alert } from "@/lib/components/ui/alert";
import { adminText } from "@/lib/ui-text";
import type { NotificationView } from "@/lib/commerce";

export function NotificationMessage({
  notification,
}: {
  notification: NotificationView;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-9"
          aria-label={adminText.notificationContent}
          title={adminText.notificationContent}
        >
          <MessageSquareText className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3"
      >
        <div>
          <p className="text-title-sm">{notification.eventLabel}</p>
          <p className="text-caption text-muted-foreground">
            {notification.channelLabel} · {notification.recipientLabel}
          </p>
        </div>
        <p className="whitespace-pre-wrap break-words text-body-sm text-soft-foreground">
          {notification.preview}
        </p>
        {notification.errorLabel ? (
          <Alert tone="warning">{notification.errorLabel}</Alert>
        ) : null}
        <p className="text-caption text-muted-foreground">
          {notification.createdLabel} ·{" "}
          {adminText.notificationAttempts(notification.attempts)}
        </p>
      </PopoverContent>
    </Popover>
  );
}
