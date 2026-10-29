"use client";
import { useState } from "react";
import { useAdminUser } from "@/services/admin/state/user";
import { LoginForm } from "./login-form";
export function LoginContent() {
  const user = useAdminUser((s) => ({ busy: s.isLoading, actions: s.actions }));
  const [error, setError] = useState<string | null>(null);
  async function signIn(input: { email: string; password: string }) {
    setError(null);
    try {
      await user.actions.signIn(input);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "로그인에 실패했습니다.",
      );
    }
  }
  return <LoginForm busy={user.busy} error={error} onSubmit={signIn} />;
}
