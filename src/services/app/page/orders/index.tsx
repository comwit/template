"use client";

import Link from "next/link";
import { useOrders } from "@/services/app/state/orders";
import { siteText, courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";
import { EmptyState } from "@/lib/components/ui/empty-state";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useOrders list(.load({ page })). 로그인 필요(API 가 거부하면 isError).
export default function Orders() {
  const orders = useOrders((state) => ({
    list: state.list.load({ page: state.page }),
    actions: state.actions,
  }));
  const list = orders.list;
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["orders"]}
      </h1>
      {list.isError ? (
        <p className="mt-8 text-body text-destructive">
          {list.error}{" "}
          <Link href="/login" className="underline">
            {siteText.pages["login"]}
          </Link>
        </p>
      ) : list.isLoading ? (
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
      ) : list.data.items.length === 0 ? (
        <EmptyState className="mt-8" title={courseText.empty} />
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {list.data.items.map((order) => (
            <li key={order.id}>
              <Link href={`/account/orders/${order.id}`} className="block">
                <p className="text-body-sm text-muted-foreground">
                  {order.displayNumber} · {order.itemTypeLabel} · {order.createdLabel}
                </p>
                <p className="text-title-md">{order.itemTitle}</p>
                <p className="text-body">
                  {order.totalLabel} · {order.statusLabel} · {order.paymentLabel}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={list.data.page}
        totalPages={list.data.totalPages}
        onChange={(page) => orders.actions.setPage(page)}
      />
    </main>
  );
}
