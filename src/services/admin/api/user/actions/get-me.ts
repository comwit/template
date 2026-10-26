"use server";

import { createAction } from "@/lib/utils";
import { getAdminServerSession } from "@/server/auth/admin";
import type { User } from "@/services/admin/api/user/types";

// api.ai.md: every export in actions must be wrapped with createAction (ESLint api-create-action).
// Declare the inner function with a `_` prefix and bundle it via resolveActions({ getMe }) in index.ts.
async function _getMe(): Promise<User | null> {
  // Preserve Better Auth's cookie cache and its session recheck on cache miss/expiry.
  // Admin retains DB-authoritative reads. No extra member/profile queries here.
  const session = await getAdminServerSession();
  if (!session?.user) return null;

  // convert the auth user into the User type
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? "",
    image: session.user.image ?? null,
    emailVerified: session.user.emailVerified,
    createdAt: session.user.createdAt,
    updatedAt: session.user.updatedAt,
  };
}

export const getMe = createAction(_getMe);

// 기본 프로필은 Better Auth의 session.user에서만 매핑한다.
// 별도 member/profile 테이블 데이터는 별도 API/query로 지연 조회한다.
// 회원 행이 없다는 이유로 로그인한 사용자를 null로 바꾸지 않는다.
// 세션 조회 실패는 그대로 전파하며 catch(() => null)로 숨기지 않는다.
