# 강의 플랫폼(LMS) 공용 템플릿

수강생 화면 디자인은 담지 않습니다. 수강생 라우트(`/`, `/courses`, `/courses/[id]`, `/checkout/[courseId]`, `/checkout/result`, `/learn/[courseId]/[lessonId]`, `/account`, `/account/courses`, `/account/orders`, `/account/orders/[id]`, `/account/certificates/[id]`, `/notices`, `/notices/[id]`, `/login`, `/signup`)는 상태(state)가 연결된 최소 골격 컴포넌트이고, 강의·수강·주문·결제·쿠폰·수강평·Q&A API와 state, 운영 어드민은 완성된 상태로 제공합니다. 파생 프로젝트는 이 템플릿을 복사한 뒤 `src/services/design.md`와 `src/app/globals.css`의 프로젝트 테마 블록을 자기 브랜드에 맞게 고치고 수강생 화면을 채웁니다.

## 앱 업데이트

`pnpm build`는 Next.js, `public/version.json`, 서비스 워커에 같은 배포 ID를 넣습니다. 기본값은 빌드마다 새 ID입니다. 배포 파이프라인에서 산출물별 `NEXT_DEPLOYMENT_ID` 또는 `DEPLOYMENT_VERSION`을 지정할 수 있으며, 같은 배포의 모든 인스턴스에는 동일한 빌드 산출물을 배포하세요.

페이지 최초 실행, 탭 복귀, 온라인 복귀 때 새 워커를 확인하며 주기적 폴링은 하지 않습니다. 업데이트가 준비되면 작업을 저장하고 **저장 후 새로고침**을 누르세요.

## 포함 기능

- 강의·카테고리·강사(표시용 프로필) 관리, 섹션·레슨 커리큘럼 편집, 레슨 영상 등록(YouTube 또는 직접 영상 URL), 미리보기 레슨, 정가·할인가·할인 기간, 공개 상태, 썸네일 업로드, TipTap 소개 본문
- 수강 신청과 결제(토스페이먼츠 결제위젯, 서버 승인, 무료 강의 즉시 수강), 쿠폰(정률·정액, 강의 한정, 기간·한도·1인 제한)
- 수강 권한(enrollment): 결제 승인 시 자동 개설, 운영자 수동 부여·회수, 수강 기간
- 강의실(플레이어): 레슨 목록, 이어보기, 진도 저장(10초 간격 + 일시정지·종료), 배속, 레슨 자료, 레슨 Q&A·댓글, 수강평
- 진도율·완강 처리, 완강 시 수료증 자동 발급
- 마이페이지: 내 강의실, 결제 내역, 미결제 취소, 환불 신청(기간·진도율 제한)
- 어드민: 대시보드(매출·수강생·완강률), 강의, 수강생·수강 현황·진도 조회, 주문, 결제·대사·환불 재시도, 환불 신청 승인·거절, 쿠폰, 수강평 답글·숨김, Q&A 답변, 공지, 배너, 연결 설정, 관리자 로그인·비밀번호 변경
- 중복 요청 방지, 승인 응답 유실 복구, 환불 재시도, 웹훅 저장과 결제 대사
- 수강생/관리자 Better Auth 분리, 관리자 공개 가입 차단
- 공용 UI, 어드민 목록·폼·상세 및 빈 상태/로딩/오류 Storybook

기본 범위는 **단일 운영자**(운영자가 강의를 올림), 원화, 주문당 강의 1개, 전액 환불입니다. 다중 강사 마켓·정산, 영상 직접 업로드·스트리밍(HLS/DRM), 라이브 강의, 가상계좌·정기결제, 문자/알림톡 발송은 포함하지 않습니다.

## 영상 호스팅

레슨 영상은 외부에 두고 주소만 저장합니다(`lessons.video = { provider: "youtube" | "url", url }`).

- `youtube`: 미공개(unlisted) 영상 주소. 강의실은 YouTube IFrame API 로 재생하며 재생 위치·배속·이어보기를 지원합니다.
- `url`: mp4 등 브라우저가 바로 재생할 수 있는 공개 영상 주소(HTML5 `<video>`).

공개 강의 상세는 미리보기 레슨의 영상만 노출하고, 나머지 레슨 영상 주소는 수강 중인 회원에게만 내려갑니다. 유출 방지가 필요한 유료 영상은 Vimeo·Mux 같은 서명 재생 서비스를 `url` 제공자로 붙이는 것을 권장합니다.

## 실행

소스는 `comwit/template`의 `course` 브랜치입니다. 공통 기본 템플릿은 같은 저장소의 `main` 브랜치에서 관리합니다.

```bash
git clone --branch course --single-branch https://github.com/comwit/template.git my-course
cd my-course
```

```bash
pnpm install
pnpm run dev
pnpm storybook
pnpm run validate
pnpm run build
pnpm storybook:build
```

앱 포트는 `.env`의 `PORT`, Storybook 기본 포트는 6006입니다. `pnpm run build`는 `@brrrd/adapter`를 통해 `dist/brrrd`를 생성합니다.

## 환경설정

새 프로젝트는 Comwit 프로젝트의 설정 프롬프트로 바인딩을 준비하고, Comwit MCP의 `setup_database`/`setup_storage` 응답 `nextSteps`를 실행합니다. 이미 연결된 프로젝트는 `list_cloud_resources` 응답의 `nextSteps`로 복원합니다. 자세한 절차는 `docs/course-resources.md`에 있습니다.

`.env.example`은 설정 이름 안내입니다. `DATABASE_URL`, `COMWIT_*` 리소스 값은 Comwit 서버 바인딩에서만 받습니다. 기존 `.env`를 덮어쓰지 말고 플랫폼 설정만 추가하세요.

| 설정                                             | 의미                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `APP_URL`                                        | 현재 환경의 정확한 앱 주소. 로컬 포트와 일치해야 하며 운영은 HTTPS   |
| `NEXT_PUBLIC_ADMIN_BASE_PATH`                    | 프로젝트별 관리자 공개 경로(`pnpm admin:path`). 변경 후 재빌드 필요 |
| `APP_AUTH_SECRET`, `ADMIN_AUTH_SECRET`           | 프로젝트·서비스별 서로 다른 강한 인증 비밀키                         |
| `PLATFORM_NAME`                                  | 플랫폼 이름                                                          |
| `ORDER_EXPIRY_MINUTES`                           | 미결제 주문 자동 만료 시간, 5~120분                                  |
| `REFUND_WINDOW_DAYS`                             | 결제 후 수강생이 환불을 신청할 수 있는 기간(일)                      |
| `REFUND_PROGRESS_LIMIT`                          | 이 진도율(%) 이상이면 수강생 환불 신청 불가                          |
| `PAYMENT_MODE`                                   | `test` 또는 `live`                                                   |
| `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `TOSS_MID` | 결제위젯용 토스 키 쌍과 상점 ID(모드와 접두어 일치)                  |
| `COURSE_CRON_SECRET`                             | `/cron/expire-orders`, `/cron/reconcile-payments` 보호용 비밀키     |

비밀키는 서버의 `src/server/config.ts`에서 읽습니다. 토스 클라이언트 키만 결제 준비 응답에 포함합니다. 연결 설정 화면은 키 값 대신 설정 여부를 보여줍니다.

## 초기 관리자 계정

관리자 공개 회원가입은 없습니다. 로컬의 Git 제외 `.env`에 `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`를 설정하고 아래 명령을 실행합니다.

```bash
pnpm admin:create
```

실행 성공 후 일회용 초기 계정 변수 두 개를 로컬 `.env`에서 제거합니다. 관리자 주소는 `APP_URL + NEXT_PUBLIC_ADMIN_BASE_PATH`입니다.

## 레이어와 확장 지점

```text
src/app                         라우팅 경계
src/services/app/state          수강생 화면에서 사용할 공개 인터페이스
src/services/app/api            강의·결제·수강·주문·커뮤니티·콘텐츠·사용자
src/services/admin/page         공통 어드민 화면
src/services/admin/state        조회·검색·편집·저장·오류 상태
src/services/admin/api          관리자 권한 검사와 화면별 응답
src/server/repository           DB 읽기와 업무 규칙의 단일 진입점
src/server/course               presenter·결제 콜백·cron 핸들러
src/server/payments             토스 서버 API 연결
src/server/storage              Comwit presign 연결
src/lib/course                  입력 검증(zod)·공용 View 타입·표시 함수
src/stories                     운영 DB와 분리된 문서용 예시
```

의존 방향은 `page → state → api → repository`입니다. 수강생 화면은 `useCatalog`, `useCheckout`, `useEnrollments`, `useOrders`, `useCommunity`, `useContent`, `useUser`를 연결합니다. 서버는 로그인 사용자와 관리자 권한을 직접 확인합니다.

결제 흐름: `useCheckout.actions.prepare({ courseId })`가 주문을 만들고(무료 강의는 즉시 확정·수강 개설, `free: true`), `mount()`가 토스 결제위젯을 `#payment-method`·`#agreement`에 그린 뒤 `pay()`가 결제를 요청합니다. 성공·실패 콜백은 `/api/payments/success|fail` 서버 경로가 처리하고 `/checkout/result?payment=…&order=…`로 돌아옵니다. 웹훅은 `/api/payments/webhook`에 등록합니다.

운영 cron: `/cron/expire-orders`(미결제 만료)와 `/cron/reconcile-payments`(결제·환불·웹훅 대사)를 `X-Comwit-Cron-Secret` 헤더와 함께 주기 호출합니다.

## Storybook API 모킹

```text
실제 앱:    실제 페이지 → 기존 state → 실제 API
Storybook:  같은 페이지 → 같은 state → app-api / admin-api mock
```

`.storybook/main.ts`의 Vite alias가 public API import를 `src/stories/mocks/{app,admin}-api/*`로 바꿉니다. 모킹하지 않은 실제 API 소스가 번들에 들어오면 빌드를 실패시킵니다. 스토리에서 `parameters: { apiMock: { mode: "empty" | "error" | "loading", delay, data } }`로 상태를 고릅니다. 결제위젯·업로드·인증 이동은 실행하지 않고 명시적인 미리보기 응답을 돌려줍니다.

어드민은 `어드민/페이지/스토리`로, 수강생 화면은 `src/stories/course/{페이지}.stories.tsx`에 `강의/{페이지}` 제목으로 둡니다. 파생 프로젝트에서 수강생 화면을 채울 때는 스토리를 먼저 만들고 그 화면을 보면서 작업합니다.
