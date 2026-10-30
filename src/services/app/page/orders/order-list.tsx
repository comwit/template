"use client";

import Link from "next/link";
import { useOrders } from "@/services/app/state/orders";
import { siteText, courseText } from "@/lib/ui-text";
import { Pager } from "@/lib/components/ui/pager";
import { EmptyState } from "@/lib/components/ui/empty-state";

// 읽는 상태: useOrders list(.suspend({ page })). 로그인 필요 — 거부되면 (app)/account/error.tsx. 돌아오면 캐시로 바로.

export function OrderList() {
  const orders = useOrders((state) => ({
    list: state.list.suspend({ page: state.page }),
    actions: state.actions,
  }));
  const list = orders.list;
  return (
    <>
      {list.isError ? (
        <p className="mt-8 text-body text-destructive">
          {list.error}{" "}
          <Link href="/login" className="underline">
            {siteText.pages["login"]}
          </Link>
        </p>
      ) : list.data.items.length === 0 ? (
        <EmptyState className="mt-8" title={courseText.empty} />
      ) : (
        <ul
          aria-busy={list.isFetching}
          className="mt-8 flex flex-col gap-4">
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
    </>
  );
}
