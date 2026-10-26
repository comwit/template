"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserRoundCog,
  Package,
  Boxes,
  ShoppingBag,
  MessageSquare,
  CreditCard,
  Users,
  Settings,
} from "lucide-react";

import { adminRoutes } from "@/lib/admin-routes";
import { useAdminUser } from "@/services/admin/state/user";
import { AdminShell, type AdminNavGroup } from "@/services/admin/_components";

// TODO: 실제 메뉴에 맞게 그룹/항목 추가 — 그룹 라벨은 사이드바에 대문자로 노출된다.
//   { label: '운영', items: [{ label, href, icon }, ...] }, { label: '설정', items: [...] }
const navGroups: AdminNavGroup[] = [
  {
    label: "운영",
    items: [
      { label: "대시보드", href: adminRoutes.dashboard, icon: LayoutDashboard },
      { label: "상품과 SKU", href: adminRoutes.products, icon: Package },
      { label: "재고", href: adminRoutes.inventory, icon: Boxes },
      { label: "주문과 배송", href: adminRoutes.orders, icon: ShoppingBag },
      { label: "결제와 환불", href: adminRoutes.payments, icon: CreditCard },
      { label: "고객", href: adminRoutes.customers, icon: Users },
      { label: "알림", href: adminRoutes.notifications, icon: MessageSquare },
    ],
  },
  {
    label: "설정",
    items: [
      { label: "연결 설정", href: adminRoutes.settings, icon: Settings },
      { label: "내 계정", href: adminRoutes.account, icon: UserRoundCog },
    ],
  },
];

const adminBrand = (
  <span className="flex items-center gap-1.5">
    <ShoppingBag className="size-7 text-primary" />
    <span className="text-title-md leading-none font-bold text-foreground">
      Shop Admin
    </span>
  </span>
);

/** 사용자 구독과 UI는 세션 셸(client.tsx)의 자식에서만 처리한다. */
export function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const adminUser = useAdminUser((state) => ({ actions: state.actions }));

  async function handleSignOut() {
    await adminUser.actions.signOut();
    router.push(adminRoutes.login);
  }

  if (decodeURIComponent(pathname) === adminRoutes.login)
    return <>{children}</>;

  return (
    <AdminShell
      brand={adminBrand}
      navGroups={navGroups}
      homeHref={adminRoutes.dashboard}
      onSignOut={handleSignOut}
    >
      {children}
    </AdminShell>
  );
}
