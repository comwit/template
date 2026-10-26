"use client";
import { useAdminOrders } from "@/services/admin/state/orders";
import { OrdersSection } from "./orders-section";
import { OrderDetails } from "./order-details";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/lib/components/ui/dialog";
import { QueryMessage } from "@/services/admin/_components/commerce";
export function OrdersContent() {
  const orders = useAdminOrders((s) => ({
    list: s.list.load({
      filter: s.filter,
      pageable: { page: s.page, limit: 20 },
    }),
    detail: s.selectedId ? s.detail.load(s.selectedId) : s.detail,
    selectedId: s.selectedId,
    filter: s.filter,
    busy: s.isSaving,
    error: s.error,
    actions: s.actions,
  }));
  return (
    <>
      <OrdersSection
        query={orders.list}
        filter={orders.filter}
        busy={orders.busy}
        onFilter={orders.actions.setFilter}
        onPage={orders.actions.setPage}
        onRefresh={() => void orders.actions.refresh()}
        onSelect={orders.actions.select}
        onExpire={() => void orders.actions.expire()}
      />
      <Dialog
        open={Boolean(orders.selectedId)}
        onOpenChange={(open) => {
          if (!open) orders.actions.select(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>주문 상세</DialogTitle>
            <DialogDescription className="sr-only">
              구매 당시 상품 정보와 결제·배송 기록입니다.
            </DialogDescription>
          </DialogHeader>
          <QueryMessage
            isError={orders.detail.isError}
            isLoading={orders.detail.isLoading || !orders.detail.isSuccess}
            error={orders.detail.error}
            onRetry={() => void orders.actions.refresh()}
          >
            {orders.detail.data ? (
              <OrderDetails
                key={orders.detail.data.id}
                order={orders.detail.data}
                busy={orders.busy}
                error={orders.error}
                onCancel={(id) => void orders.actions.cancel(id)}
                onDeliver={(id) => void orders.actions.deliver(id)}
                onShip={(input) => void orders.actions.ship(input)}
                onRefund={(input) => void orders.actions.refund(input)}
                onRetryRefund={(id) => void orders.actions.retryRefund(id)}
              />
            ) : null}
          </QueryMessage>
        </DialogContent>
      </Dialog>
    </>
  );
}
