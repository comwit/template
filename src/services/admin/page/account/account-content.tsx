"use client";
import { useAdminUser } from "@/services/admin/state/user";
import { AccountForm } from "./account-form";
export function AccountContent() {
  const user = useAdminUser((s) => ({ busy: s.isLoading, actions: s.actions }));
  return (
    <AccountForm busy={user.busy} onChange={user.actions.changePassword} />
  );
}
