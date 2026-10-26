"use client";

import type { ReactNode } from "react";
import { Button } from "@/lib/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/lib/components/ui/popover";
import { adminText } from "@/lib/ui-text";

/** The API has already formatted the value; only its visual hierarchy lives here. */
export function DateValue({ value }: { value: string }) {
  const [date, time] = value.split(" ");
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(date))
    return (
      <span className="whitespace-nowrap text-body-sm tabular-nums">
        {value}
      </span>
    );
  return (
    <span
      className="inline-flex flex-col whitespace-nowrap tabular-nums"
      aria-label={value}
    >
      <span className="text-body-sm">{date}</span>
      {time ? (
        <span className="text-caption text-muted-foreground">{time}</span>
      ) : null}
    </span>
  );
}

export function NumberValue({ children }: { children: ReactNode }) {
  return (
    <div className="whitespace-nowrap text-right font-medium tabular-nums">
      {children}
    </div>
  );
}

/** Keyboard/touch access to full values without making every table row verbose. */
export function ReferenceValue({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto max-w-full justify-start px-0 py-1 font-mono text-body-sm"
          aria-label={`${children} ${adminText.reference}`}
        >
          <span className="truncate">{children}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <p className="break-all font-mono text-body-sm select-text">{value}</p>
      </PopoverContent>
    </Popover>
  );
}
