# SKU 쇼핑몰 공용 템플릿

고객 디자인은 담지 않습니다. 고객 라우트(`/`, `/products`, `/products/[id]`, `/cart`, `/checkout`, `/checkout/result`, `/login`, `/signup`, `/account`, `/account/orders`, `/account/orders/[id]`)는 제목만 있는 빈 깡통 컴포넌트이고, 상품·장바구니·주문·결제 API와 state, 운영 어드민은 완성된 상태로 제공합니다. 파생 프로젝트는 이 템플릿을 복사한 뒤 `.storybook/stories/design-system/design.mdx`와 `src/app/globals.css`의 프로젝트 테마 블록을 자기 브랜드에 맞게 고치고 고객 화면을 채웁니다.

## 앱 업데이트

`pnpm build`는 Next.js, `public/version.json`, 서비스 워커에 같은 배포 ID를 넣습니다. 기본값은 빌드마다 새 ID입니다. CI에서 산출물별 `NEXT_DEPLOYMENT_ID` 또는 `DEPLOYMENT_VERSION`을 지정할 수 있으며, 같은 배포의 모든 인스턴스에는 동일한 빌드 산출물을 배포하세요.

페이지 최초 실행, 탭 복귀, 온라인 복귀 때 새 워커를 확인하며 주기적 폴링은 하지 않습니다. 업데이트가 준비되면 작업을 저장하고 **저장 후 새로고침**을 누르세요. 다른 앱 탭이나 창은 작업을 저장한 뒤 닫아야 합니다. 새 워커 활성화 중 이전 배포 캐시를 삭제하고 새 워커 아래에서 페이지를 새로고침합니다. 모든 앱 창을 닫아도 브라우저의 기본 활성화가 진행됩니다. 이 변경 이전 버전을 사용하던 창은 한 번 모두 닫고 다시 열어야 할 수 있습니다.

## 포함 기능

- 상품·카테고리·SKU 옵션/가격/판매 상태 관리, 상품 이미지 업로드
- SKU별 실재고·예약·판매 가능 수량, 입출고 사유와 이력
- 고객별 장바구니, 서버 가격 계산, 주문 당시 상품·옵션·가격·배송지 보존
- 주문 조회, 결제 대기 만료, 미결제 취소, 송장 등록, 배송 완료
- 토스 SDK v2 카드/간편결제 결제창, 서버 승인, 전체/부분환불, 반품 재고 복원
- 중복 요청 방지, 승인 응답 유실 복구, 환불 재시도, 웹훅 저장과 결제 대사
- 고객 조회, 운영 현황, 연결 설정, 관리자 로그인·비밀번호 변경
- 고객/관리자 Better Auth 분리, 관리자 공개 가입 차단
- 공용 UI, 어드민 목록·폼·상세 및 빈 상태/로딩/오류 Storybook

기본 범위는 단일 판매자, 원화 실물상품, 주문당 한 개의 송장입니다. 가상계좌·정기결제·다중 창고·쿠폰·교환 자동화는 포함하지 않습니다. 카드/간편결제는 `useCheckout.actions.pay()`의 `method: "CARD"`로 요청합니다.

## 실행

소스는 `comwit/template`의 `shop` 브랜치입니다. 공통 기본 템플릿은 같은 저장소의 `main` 브랜치에서 관리합니다.

```bash
git clone --branch shop --single-branch https://github.com/comwit/template.git my-shop
cd my-shop
```

```bash
pnpm install
pnpm run dev
pnpm storybook
pnpm run validate
pnpm test
pnpm run build
pnpm storybook:build
```

앱 포트는 `.env`의 `PORT`, Storybook 기본 포트는 6006입니다. 포트 충돌 시 CLI에 표시된 주소를 사용하세요. `pnpm run build`는 `@brrrd/adapter`를 통해 `dist/brrrd`를 생성합니다. Storybook 결과는 `storybook-static`입니다.

## 환경설정

새 프로젝트는 Comwit 프로젝트의 설정 프롬프트로 바인딩을 준비하고, Comwit MCP의 `setup_database`/`setup_storage` 응답 `nextSteps`를 실행합니다. 이미 연결된 프로젝트는 `list_cloud_resources` 응답의 `nextSteps`로 복원합니다. MCP는 사전 등록되어 있으므로 다시 등록하거나 PAT를 발급하지 않습니다.

`.env.example`은 설정 이름 안내입니다. 다른 프로젝트의 `.env`나 리소스 ID를 복사하지 마세요. `DATABASE_URL`, `COMWIT_*` 리소스 값은 Comwit 서버 바인딩에서만 받습니다. DB·스토리지 인증에는 `COMWIT_CLOUD_TOKEN`을 사용합니다. 기존 `.env`를 덮어쓰지 말고 쇼핑몰 설정만 추가하세요.

| 설정                                             | 의미                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `APP_URL`                                        | 현재 환경의 정확한 앱 주소. 로컬 포트와 일치해야 하며 운영은 HTTPS |
| `NEXT_PUBLIC_ADMIN_BASE_PATH`                    | 프로젝트별 관리자 공개 경로. 변경 후 재빌드 필요                   |
| `APP_AUTH_SECRET`, `ADMIN_AUTH_SECRET`           | 프로젝트·서비스별 서로 다른 강한 인증 비밀키                       |
| `SHOP_NAME`                                      | 쇼핑몰 이름                                                        |
| `SHOP_SHIPPING_FEE`                              | 기본 배송비, 원 단위 정수                                          |
| `SHOP_FREE_SHIPPING_THRESHOLD`                   | 무료배송 기준 금액                                                 |
| `STOCK_RESERVATION_MINUTES`                      | 결제 대기 재고 예약 시간, 5~120분                                  |
| `PAYMENT_MODE`                                   | `test` 또는 `live`                                                 |
| `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `TOSS_MID` | 동일 상점·동일 환경의 토스 키 쌍과 상점 ID                         |
| `COMMERCE_CRON_SECRET`                           | 정기 처리 경로 보호용 비밀키                                       |

비밀키는 서버의 `src/server/config.ts`에서 읽습니다. 토스 클라이언트 키만 결제 준비 응답에 포함합니다. 연결 설정 화면은 키 값 대신 설정 여부를 보여줍니다. 호스팅 App/Code 환경은 Comwit MCP `upsert_envs`로 동기화하고 배포합니다.

## 초기 관리자 계정

관리자 공개 회원가입은 없습니다. 원하는 이메일과 비밀번호를 명시적으로 지정한 뒤, 로컬의 Git 제외 `.env`에 `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`를 설정하고 아래 명령을 실행합니다.

```bash
pnpm admin:create
```

이 명령은 Better Auth의 서버 전용 관리자 API를 사용합니다. 실행 성공 후 일회용 초기 계정 변수 두 개를 로컬 `.env`에서 제거합니다. 빌드나 서버 시작 시 자동 실행되지 않습니다. 인증 정보는 명령 인자·소스·로그에 넣지 않습니다.

관리자 주소는 `APP_URL + NEXT_PUBLIC_ADMIN_BASE_PATH`입니다. 실제 파일 경로 `/admin`은 외부에서 404를 반환합니다. 관리자에게는 로그인 후 `내 계정`에서 현재 비밀번호를 확인하고 비밀번호를 변경하는 기능이 제공됩니다. 변경 시 다른 세션이 취소됩니다.

## 레이어와 확장 지점

```text
src/app                         라우팅 경계
src/services/app/state          고객 화면에서 사용할 공개 인터페이스
src/services/app/api            상품·장바구니·주문·결제·사용자
src/services/admin/page         공통 어드민 화면
src/services/admin/state        조회·검색·편집·저장·오류 상태
src/services/admin/api          관리자 권한 검사와 화면별 응답
src/server/repository           DB 읽기와 업무 규칙의 단일 진입점
src/server/payments             토스 서버 API 연결
src/server/storage              Comwit presign 연결
src/lib/commerce                입력 검증·공용 타입
src/stories                     운영 DB와 분리된 문서용 예시
```

의존 방향은 `page → state → api → repository`입니다. 실제 고객 화면을 만들 때 `useCatalog`, `useCart`, `useCheckout`, `useOrders`, `useUser`를 연결합니다. 서버는 로그인 사용자와 관리자 권한을 직접 확인합니다. 고객 ID를 클라이언트의 권한 증명으로 사용하지 않습니다.

`useCheckout.actions.prepare()`에 SKU/수량/배송지와 재시도 동안 유지하는 `requestKey`를 전달한 뒤 `pay()`를 호출합니다. 결제 성공·실패 콜백은 서버 경로에서 처리하며, 고객 메인으로 `payment`/`order` 쿼리와 함께 돌아옵니다. 결과 화면은 파생 프로젝트가 `checkout-result` 깡통을 채워 완성합니다.

화면별 `*-section.tsx`, `*-form.tsx`는 표시와 입력 컴포넌트이고 `*-content.tsx`가 state를 연결합니다. Storybook은 실제 페이지와 기존 state를 사용하고, Vite가 API import를 전용 mock에 연결합니다. 가짜 상품·고객 데이터는 `src/stories`와 `tests`에서만 사용하며 운영 데이터를 자동 생성하지 않습니다.

## Storybook API 모킹

```text
실제 앱:    실제 페이지 → 기존 state → 실제 API
Storybook:  같은 페이지 → 같은 state → app-api / admin-api mock
```

`.storybook/main.ts`의 Vite alias에서 public API import를 바꿉니다. 실제 앱의 API/state에는 mock import나 Storybook 분기가 없습니다. 모킹하지 않은 실제 API 소스가 번들에 들어오면 빌드를 실패시킵니다.

- `src/stories/mocks/app-api`: catalog, cart, checkout, orders, user
- `src/stories/mocks/admin-api`: catalog, inventory, orders, payments, customers, dashboard, settings, notifications, media, user
- `runtime.ts`: 스토리별 데이터·mock 함수 초기화, 응답 복제, 목록 검색·페이지네이션
- `preview-state.tsx`: 기존 StateProvider와 인증 hydration만 제공하는 공통 실행 환경

스토리에서 `parameters: { apiMock: { mode: "empty" } }`로 빈 상태를, `"error"`와 `"loading"`으로 API 오류·로딩 응답을 선택합니다. 화면 표시는 실제 컴포넌트 구현을 따릅니다. 공용 DataTable은 오류를 빈 목록과 구분해 표시하고, 어드민에서는 빈 행으로 표를 채우지 않습니다. `delay`는 응답 지연(ms), `data`는 예시 데이터 덮어쓰기입니다. 예를 들어 `data: { appUser: null }`은 비로그인, `data: { products: [...] }`는 브랜드 상품 시안입니다. 스토리마다 state와 모킹 데이터를 초기화하며 Docs의 각 스토리도 별도 iframe에서 실행합니다.

모킹 경계에서도 실제 Server Function의 wire codec으로 요청과 응답을 직렬화합니다. state의 반응형 Proxy나 화면에서 편집 중인 배열이 모킹 저장소에 그대로 보관되지 않습니다.

상품 저장·재고 조정·장바구니 수량·주문 상태 등은 메모리에서 반영됩니다. 이 모킹은 디자인 확인용이며 서버 업무 규칙의 대체 구현이 아닙니다. 실제 인증 이동, 결제창, 파일 업로드는 실행하지 않습니다. 인증 상태와 업로드 이미지는 fixture로 지정하며, 해당 실제 동작을 시도하면 명시적인 미리보기 응답을 표시합니다. 비밀번호 변경은 로컬 성공 응답입니다. 어드민은 `어드민/페이지/스토리`로 정리합니다. 목록·빈 화면·로딩·오류와 등록·수정·상세·환불은 각 페이지 아래에서 실제 페이지와 API 모킹으로 확인합니다. 고객 화면은 `src/stories/shop/{페이지}.stories.tsx`에 `쇼핑몰/{페이지}` 제목으로 두고, 같은 app-api 모킹과 `data: { products: [...] }` 같은 fixture로 디자인을 확인하면서 만듭니다. 파생 프로젝트에서 고객 화면을 채울 때는 스토리를 먼저 만들고 그 화면을 보면서 작업합니다.

## DB와 원자적 저장

현재 스키마는 쇼핑몰 16개, 인증 8개, 동시 변경 제어 1개로 구성됩니다. 금액은 원 단위 정수, 업무 시간은 UTC로 저장하고 화면에서는 KST로 표시합니다. 상품 정보를 변경해도 주문 당시 스냅샷은 변하지 않습니다.

Comwit Cloud의 HTTP DB는 **여러 요청에 걸친 interactive transaction을 지원하지 않습니다**. 이 템플릿은 `repository/atomic.ts`에서 읽은 버전을 확인하고 모든 변경을 한 번의 원자적 배치로 커밋합니다. 버전 충돌은 재조회 후 최대 8회 시도합니다. 배치의 한 문장이 실패하면 전체가 롤백됩니다. `src/server/db/index.ts`는 Drizzle batch를 명시적인 atomic mode로 실행하고 interactive transaction 호출은 차단합니다.

새로운 쇼핑몰 변경 로직도 반드시 `atomic(async (db, add) => ...)`를 사용하세요. 콜백 안에서는 DB를 조회하고 SQL을 `add()`로 등록합니다. 외부 결제·스토리지 요청은 콜백 밖에서 실행합니다. 결제 승인/환불의 진행 상태와 요청키를 먼저 저장한 뒤 외부 API를 호출하여 응답 유실을 복구합니다. 이 구조는 고처리량 멀티테넌트 시스템보다 단일 쇼핑몰의 일관성을 우선합니다.

```bash
pnpm drizzle-kit generate
# 생성 SQL 검토 후 승인된 작업 범위에서 적용
pnpm drizzle-kit migrate
```

생성된 migration SQL을 직접 수정하거나 `push`로 우회하지 않습니다. 신규 기능은 DBML → Drizzle 스키마 → repository → API → state → 화면 순서로 확장합니다.

## 토스 테스트와 운영 전환

토스 상점의 테스트 키/MID를 환경변수에 넣어야 실제 토스 테스트 결제를 할 수 있습니다. 키가 없으면 결제를 시작하지 않습니다. `pnpm test`의 결제사 응답은 테스트용 대역이며 실결제·토스 테스트 결제 실행을 의미하지 않습니다.

- 승인 전에 서버 저장 금액과 `orderId`·`paymentKey`를 검증합니다.
- 승인 결과가 불명확하면 재고 예약을 유지하고 토스 조회 API로 확인합니다.
- 환불 수량·배송비·잔액은 서버에서 계산합니다. 같은 환불은 같은 요청키로 재시도합니다.
- 토스 관리자에서 직접 취소한 내역은 잔액에 반영하고 자동 재고 복원은 하지 않습니다. 이 경우 상품별 환불 배분·재고는 운영자가 대사해야 하며, 대사되지 않은 상태에서는 추가 환불을 차단합니다.
- 결과가 없는 오래된 환불을 무조건 재전송하지 않습니다. 24시간 이후에는 토스 내역 확인을 요구합니다.

운영 전환 시 `PAYMENT_MODE=live`, 라이브 키 쌍/MID, 운영 `APP_URL`을 설정합니다. 토스 계약·사용 결제수단 활성화와 아래 운영 웹훅/정기 처리 등록도 필요합니다. 코드 변경은 필요하지 않습니다. 테스트 주문은 운영 키로 승인·취소할 수 없으므로 테스트/운영 데이터는 별도 프로젝트 또는 DB로 분리하는 구성을 권장합니다.

공식 문서: [SDK v2 결제창](https://docs.tosspayments.com/guides/v2/payment-window/integration), [운영 전환 확인](https://docs.tosspayments.com/guides/v2/deploy-checklist), [웹훅](https://docs.tosspayments.com/guides/v2/webhook).

## 웹훅과 정기 처리

토스 개발자센터에 운영 주소의 `/api/payments/webhook`을 등록하고 `PAYMENT_STATUS_CHANGED`, `CANCEL_STATUS_CHANGED` 이벤트를 선택합니다. 웹훅은 DB에 저장한 뒤 200을 반환하고 Next.js `after()`로 즉시 대사를 시도합니다. brrrd의 `waitUntil`이 응답 이후 작업 수명을 유지합니다. 실패 건은 DB에 남아 정기/관리자 재처리 대상이 됩니다. 본문의 금액·상태를 신뢰하지 않고, 작업자가 토스 서버에서 다시 조회해 상점·주문·금액을 확인합니다.

배포 후 Comwit MCP로 다음 작업을 각각 등록하세요. 스케줄 등록은 로컬 코드 생성/빌드만으로 수행되지 않습니다.

| 경로                            | 역할                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `POST /cron/expire-orders`      | 미결제 예약 해제. 실행당 최대 100건                   |
| `POST /cron/reconcile-payments` | 미확인 승인·환불과 저장된 웹훅 처리. 분류별 최대 30건 |

두 경로는 `X-Comwit-Cron-Secret` 헤더를 검사합니다. Comwit MCP로 발급한 비밀키를 `COMMERCE_CRON_SECRET`에 저장하고 작업 등록 시 같은 키를 사용합니다. 어드민의 “만료 주문 정리”, “미확인 결제 재확인”으로도 동일 처리를 실행할 수 있습니다.

## 검증과 배포

자동 테스트는 임시 로컬 DB에 실제 migration을 적용합니다. 동시 주문·중복 요청·배치 롤백·주문 스냅샷·금액 변조·응답 유실·부분환불·배송 조건·관리자 권한·가입 차단·세션 폐기·웹훅을 검증합니다. 운영 DB에 테스트 상품이나 계정을 생성하지 않습니다.

개발 시 `pnpm run validate`, `pnpm test`, `pnpm run build`, `pnpm storybook:build`를 실행하세요. mutation testing은 포함하지 않습니다.

배포는 `AGENTS.md`의 실행 환경 규칙을 따릅니다. `local`에서는 검증/빌드 후 Comwit CLI로 `dist/brrrd`를 배포하고, `sandbox`에서는 화면의 배포 버튼을 사용합니다. 배포 대상은 검증된 서버 바인딩에서 받으며 자격증명을 명령 인자로 전달하지 않습니다.


## SOLAPI 알림 / 문자

주문 결제 완료, 배송 시작·완료, 누적 환불 완료, 미결제 주문 취소를 SOLAPI로 발송합니다. `repository → api → state → page` 흐름으로 `/notifications` 어드민에 기록·결과 조회·확정 실패 재발송을 제공합니다. 고객 홈은 빈 깡통 컴포넌트입니다.

- 문자: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, 사전 등록된 `SOLAPI_SENDER_NUMBER`를 넣고 `SOLAPI_CHANNEL=sms`, `SOLAPI_ENABLED=true`로 활성화합니다. 길이에 따라 SOLAPI가 SMS/LMS를 구분합니다. Toss의 `PAYMENT_MODE=test`와 무관하게 실제 발송·요금이 발생합니다.
- 알림톡: `SOLAPI_CHANNEL=alimtalk`, `SOLAPI_KAKAO_PF_ID`, `SOLAPI_TEMPLATE_{PAID,SHIPPED,DELIVERED,REFUNDED,CANCELLED}`를 추가합니다. 승인된 템플릿 변수는 공통 `#{상점명}`, `#{주문번호}`, 결제·환불은 `#{금액}`, 배송 시작은 `#{택배사}`, `#{운송장번호}`입니다. 환불 금액은 누적 환불액입니다. 알림톡의 자동 문자 대체 발송은 끕니다. 문자 발송은 `sms` 채널로 선택합니다.
- 상점명·발신번호·채널·템플릿 ID·자격 증명은 환경변수로 관리합니다. 로컬 `.env`와 배포 환경에 같은 키를 등록합니다. SOLAPI 키는 브라우저로 전달하지 않습니다.
- 연동 전 이벤트는 `skipped`로 기록하며, 키 입력 후 과거 테스트 주문을 소급 발송하지 않습니다. 활성화 후 새 이벤트부터 발송합니다.
- 주문 변경과 outbox 삽입은 한 DB atomic batch로 저장합니다. 외부 발송은 커밋 뒤 Next `after()`에서 실행합니다. 실패·타임아웃은 주문 성공을 되돌리지 않습니다.
- `2000`은 접수, `4000`은 전달 성공입니다. 타임아웃·응답 유실은 `unknown`으로 보존하며, 수신번호·요청 시각·고유 attempt marker로 SOLAPI 내역을 조회합니다. 내역을 찾지 못해도 자동 재발송하지 않습니다. 어드민의 재발송은 실패가 확정된 건만 최대 5회까지 허용하며 새 attempt marker와 감사 기록을 남깁니다.
- `/cron/send-notifications`는 기존 `X-Comwit-Cron-Secret` 검증을 사용하는 독립 유지보수 작업입니다. 한 번에 최대 10건, 미확인 내역은 최소 1시간 간격으로 확인합니다. 정상 경로는 커밋 직후 처리하며, 배포에 등록하는 일일 cron은 장애 복구용입니다. 대규모 운영에서는 별도의 주기 스케줄러로 같은 보호 경로를 더 자주 호출하세요.
- 어드민은 수신번호를 마스킹하고 상태·내용·재처리 버튼을 바로 보여줍니다. `skipped`와 `unknown`에는 재발송 버튼을 주지 않습니다.

공식 계약: [발송 API](https://solapi.com/developers/api/messages), [HMAC 인증](https://solapi.com/developers/api/authentication-api-key), [발송 내역 조회](https://solapi.com/developers/api/msg-getList). 실제 SOLAPI 계정 발송은 키가 없어 아직 실행하지 않았습니다. 자동 테스트는 제공자 응답을 대체해 성공·접수 거절·응답 유실·대사·중복 실행을 검증합니다.
