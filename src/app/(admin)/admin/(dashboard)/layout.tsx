import { redirect } from "next/navigation";
import { getAdminServerSession } from "@/server/auth/admin";
import { adminRoutes } from "@/lib/admin-routes";
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminServerSession();
  if (!session?.user || session.user.role !== "admin" || session.user.banned)
    redirect(adminRoutes.login);
  return <>{children}</>;
}
