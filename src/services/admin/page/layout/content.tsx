"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserRoundCog,
  BookOpen,
  FileDown,
  Contact,
  GraduationCap,
  Receipt,
  CreditCard,
  RotateCcw,
  Ticket,
  Star,
  MessageCircleQuestion,
  Megaphone,
  Image as ImageIcon,
  Settings,
} from "lucide-react";

import { adminRoutes } from "@/lib/admin-routes";
import { useAdminUser } from "@/services/admin/state/user";
import { AdminShell, type AdminNavGroup } from "@/services/admin/_components";

// TODO: 실제 메뉴에 맞게 그룹/항목 추가 — 그룹 라벨은 사이드바에 대문자로 노출된다.
//   { label: '운영', items: [{ label, href, icon }, ...] }, { label: '설정', items: [...] }
const navGroups: AdminNavGroup[] = [
  {
    label: "강의",
    items: [
      { label: "대시보드", href: adminRoutes.dashboard, icon: LayoutDashboard },
      { label: "강의", href: adminRoutes.courses, icon: BookOpen },
      { label: "디지털 상품", href: adminRoutes.products, icon: FileDown },
      { label: "수강생", href: adminRoutes.students, icon: GraduationCap },
      { label: "리드", href: adminRoutes.leads, icon: Contact },
      { label: "수강평", href: adminRoutes.reviews, icon: Star },
      { label: "Q&A", href: adminRoutes.questions, icon: MessageCircleQuestion },
    ],
  },
  {
    label: "결제",
    items: [
      { label: "주문", href: adminRoutes.orders, icon: Receipt },
      { label: "결제와 환불", href: adminRoutes.payments, icon: CreditCard },
      { label: "환불 신청", href: adminRoutes.refunds, icon: RotateCcw },
      { label: "쿠폰", href: adminRoutes.coupons, icon: Ticket },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { label: "공지", href: adminRoutes.notices, icon: Megaphone },
      { label: "배너", href: adminRoutes.banners, icon: ImageIcon },
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
    <GraduationCap className="size-7 text-primary" />
    <span className="text-title-md leading-none font-bold text-foreground">
      Course Admin
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
