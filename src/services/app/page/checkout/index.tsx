"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/services/app/state/checkout";
import { siteText, courseText } from "@/lib/ui-text";
import { Button } from "@/lib/components/ui/button";
import { Input } from "@/lib/components/ui/input";
import { Alert } from "@/lib/components/ui/alert";

// 빈 깡통. 파생 프로젝트에서 섹션 파일로 나눠 채운다(page.ai.md).
// 읽는 상태: useCheckout quote(.load({ courseId, couponCode }) — 쿠폰이 바뀌면 인자가 바뀌어 다시 받는다), checkout, mounted, isSaving, error.
// 흐름: 결제하기 → prepare() → free 면 /learn 으로, 아니면 mount() 가 `#payment-method`·`#agreement` 에 토스 결제위젯을 그린다 → 결제 진행 → pay().
export default function Checkout({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [couponInput, setCouponInput] = useState("");
  const checkout = useCheckout((state) => ({
    quote: state.quote.load({ courseId, couponCode: state.couponCode }),
    couponCode: state.couponCode,
    checkout: state.checkout,
    mounted: state.mounted,
    isSaving: state.isSaving,
    error: state.error,
    actions: state.actions,
  }));
  const quote = checkout.quote;
  const data = quote.data;
  const actions = checkout.actions;

  // 화면을 떠나면 준비된 주문·위젯을 비운다(다른 강의 결제에 옛 주문이 섞이지 않도록).
  // actions 는 ref 로 들고 있어 재렌더마다 cleanup 이 돌아 위젯을 지우는 일이 없다.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);
  useEffect(() => () => actionsRef.current.clear(), []);

  const startPayment = async () => {
    const prepared = await actions.prepare({ courseId });
    if (!prepared) return;
    if (prepared.free) {
      router.push(`/learn/${courseId}`);
      return;
    }
    await actions.mount();
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-display-sm text-balance">
        {siteText.pages["checkout"]}
      </h1>

      {quote.isError ? (
        // 쿠폰 형식 오류(4자 미만·허용 외 문자)는 서버 검증에서 바로 던지므로 여기로 온다. 쿠폰을 지워 되돌릴 수 있어야 한다.
        <div className="mt-8 flex flex-col items-start gap-2">
          <p className="text-body text-destructive">{quote.error}</p>
          {checkout.couponCode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCouponInput("");
                actions.setCoupon("");
              }}
            >
              쿠폰 제거
            </Button>
          ) : (
            <Link href="/login" className="text-body-sm underline">
              {siteText.pages["login"]}
            </Link>
          )}
        </div>
      ) : quote.isLoading || !data ? (
        <p className="mt-8 text-body text-muted-foreground">{courseText.loading}</p>
      ) : (
        <>
          <section className="mt-8">
            <p className="text-title-md">{data.courseTitle}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-body">
              <dt className="text-muted-foreground">정가</dt>
              <dd>{data.listPriceLabel}</dd>
              <dt className="text-muted-foreground">쿠폰 할인</dt>
              <dd>
                {data.couponDiscountLabel}
                {data.couponCode ? ` (${data.couponCode})` : ""}
              </dd>
              <dt className="text-muted-foreground">결제 금액</dt>
              <dd>{data.totalLabel}</dd>
            </dl>
          </section>

          {data.alreadyEnrolled ? (
            <Alert className="mt-6">
              이미 수강 중인 강의입니다.{" "}
              <Link href={`/learn/${courseId}`} className="underline">
                {siteText.pages["learn"]}
              </Link>
            </Alert>
          ) : (
            <>
              <section className="mt-6 flex max-w-md flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="쿠폰 코드"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    disabled={checkout.mounted}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={checkout.mounted || checkout.isSaving}
                    onClick={() => actions.setCoupon(couponInput)}
                  >
                    적용
                  </Button>
                </div>
                {data.couponError ? (
                  <p className="text-body-sm text-destructive">{data.couponError}</p>
                ) : null}
              </section>

              {checkout.error ? (
                <Alert tone="destructive" className="mt-6">
                  {checkout.error}
                </Alert>
              ) : null}

              <section className="mt-6 flex flex-col gap-3">
                {!checkout.mounted ? (
                  <Button
                    type="button"
                    className="w-fit"
                    disabled={checkout.isSaving}
                    onClick={startPayment}
                  >
                    {data.isFree ? "무료로 수강 신청" : "결제하기"}
                  </Button>
                ) : null}
                {/* 토스 결제위젯 컨테이너. mount() 가 그리기 전엔 비어 있다(항상 렌더). */}
                <div id="payment-method" />
                <div id="agreement" />
                {checkout.mounted && checkout.checkout ? (
                  <Button
                    type="button"
                    className="w-fit"
                    disabled={checkout.isSaving}
                    onClick={() => actions.pay()}
                  >
                    결제 진행 ({data.totalLabel})
                  </Button>
                ) : null}
              </section>
            </>
          )}
        </>
      )}

      <p className="mt-8 text-body-sm">
        <Link href={`/courses/${courseId}`} className="underline">
          {siteText.pages["course-detail"]}
        </Link>
      </p>
    </main>
  );
}
