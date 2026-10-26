import "server-only";
import { ActionError } from "@/lib/utils";
import { getAdminServerSession } from "./admin";
import { getAppServerSession } from "./app";
export async function requireAdmin() {
  const session = await getAdminServerSession();
  if (!session?.user || session.user.role !== "admin" || session.user.banned)
    throw new ActionError("관리자 로그인이 필요합니다.");
  return session.user;
}
export async function requireCustomer() {
  const session = await getAppServerSession();
  if (!session?.user) throw new ActionError("로그인이 필요합니다.");
  return session.user;
}
