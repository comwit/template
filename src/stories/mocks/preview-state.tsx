import type { ReactNode } from "react";
import { StateProvider } from "@/lib/state";
import { useUser } from "@/services/app/state/user";
import { useAdminUser } from "@/services/admin/state/user";
import { getMockSessions } from "./runtime";

function Sessions({ children }: { children: ReactNode }) {
  const sessions = getMockSessions();
  useUser.hydrate({ me: { data: sessions.appUser } });
  useAdminUser.hydrate({ me: { data: sessions.adminUser } });
  return <>{children}</>;
}

/** Infrastructure only: render the actual page unchanged with a fresh state registry. */
export function PreviewState({ children }: { children: ReactNode }) {
  return (
    <StateProvider>
      <Sessions>{children}</Sessions>
    </StateProvider>
  );
}
