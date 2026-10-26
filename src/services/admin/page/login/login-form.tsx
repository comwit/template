"use client";

import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { TextField } from "@/lib/components/ui/text-field";
import { adminCard } from "@/services/admin/_components";
import { cn } from "@/lib/utils";
import { Alert } from "@/lib/components/ui/alert";

/**
 * Admin Login — `@/lib/components/ui` 컨트롤 + 어드민 카드 표면.
 * 공개 관리자 회원가입은 제공하지 않는다.
 * 실제 인증 state를 통해 로그인한다.
 */
export function LoginForm({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onSubmit(input: { email: string; password: string }): Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ email, password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-6">
      <div className={cn(adminCard, "w-full max-w-[380px] p-8")}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-title-lg">관리자 로그인</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <TextField label="이메일" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </TextField>
              <TextField label="비밀번호" required>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />
              </TextField>
              {error ? <Alert tone="destructive">{error}</Alert> : null}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={busy}
              >
                {busy ? "로그인 중…" : "로그인"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
