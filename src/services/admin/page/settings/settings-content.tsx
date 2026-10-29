"use client";
import { useSettings } from "@/services/admin/state/settings";
import { QueryMessage } from "@/services/admin/_components/course";
import { SettingsSection } from "./settings-section";
export function SettingsContent() {
  const settings = useSettings((s) => ({
    data: s.data.load(),
    actions: s.actions,
  }));
  return (
    <QueryMessage
      isError={settings.data.isError}
      isLoading={settings.data.isLoading || !settings.data.isSuccess}
      error={settings.data.error}
      onRetry={() => void settings.actions.refresh()}
    >
      {settings.data.data ? (
        <SettingsSection settings={settings.data.data} />
      ) : null}
    </QueryMessage>
  );
}
