/**
 * Default component text for screens and screen readers, plus the date/time display locale.
 * Set the app's language in this file; installed source belongs to your app, so edit the strings directly.
 * Individual component props (labels, placeholder, title, emptyMessage, etc.) override these defaults.
 *
 * This Korean version is installed by comwit-ui init --locale ko (or "locale": "ko" in comwit.json).
 */
export const uiText = {
  appUpdate: {
    title: '새 버전이 준비됐어요',
    ready: '진행 중인 작업을 저장한 뒤 업데이트해 주세요.',
    blocked: '다른 앱 탭이나 창의 작업을 저장하고 닫은 뒤 다시 눌러 주세요.',
    failed: '업데이트를 적용하지 못했어요. 잠시 후 다시 눌러 주세요.',
    action: '저장 후 새로고침',
  },
  /**
   * Intl locale for date, month, and time picker display.
   */
  locale: 'ko-KR',
  close: '닫기',
  back: '뒤로가기',
  bottomNav: '주요 메뉴',
  autocomplete: { empty: '결과가 없어요' },
  chat: {
    placeholder: '메시지',
    send: '보내기',
    stop: '멈추기',
    scrollToBottom: '최신 메시지로',
    typing: '입력 중',
    newMessages: (n: number) => `새 메시지 ${n}개`,
  },
  chip: { remove: '삭제' },
  dataTable: {
    empty: '아직 표시할 항목이 없어요.',
    error: '불러오지 못했습니다.',
    refreshing: '업데이트 중',
    previous: '이전 페이지',
    next: '다음 페이지',
    range: (start: number, end: number, all: number) =>
      all > 0 ? `${all.toLocaleString()}개 중 ${start}–${end}` : '0개',
  },
  datePicker: {
    placeholder: '날짜 선택',
    title: '날짜 선택',
    clear: '지우기',
    today: '오늘',
    previousMonth: '이전 달',
    nextMonth: '다음 달',
  },
  monthPicker: {
    placeholder: '월 선택',
    title: '월 선택',
    clear: '지우기',
    thisMonth: '이번 달',
    previousYear: '이전 해',
    nextYear: '다음 해',
  },
  timePicker: { placeholder: '시간 선택', title: '시간 선택' },
  editor: { linkUrl: '링크 주소', imageUrl: '이미지 주소' },
  pagination: { nav: '페이지 이동', previous: '이전', next: '다음', more: '페이지 더 보기' },
  pager: {
    nav: '페이지 이동',
    previous: '이전 페이지',
    next: '다음 페이지',
    page: (p: number) => `${p}페이지`,
  },
  pullToRefresh: { refreshing: '새로고침 중' },
  toast: { close: '알림 닫기' },
  popup: {
    confirmTitle: '계속할까요?',
    confirm: '확인',
    cancel: '취소',
    alertTitle: '알림',
    ok: '확인',
  },
}

/** 강의 플랫폼 공통 라벨. 파생 프로젝트에서 문구를 바꾼다. */
export const courseText = {
  free: "무료",
  noPrice: "미등록",
  courses: "강의",
  products: "디지털 상품",
  students: "수강생",
  leads: "리드",
  orders: "주문",
  payments: "결제와 환불",
  refunds: "환불 신청",
  coupons: "쿠폰",
  reviews: "수강평",
  questions: "Q&A",
  notices: "공지",
  banners: "배너",
  settings: "연결 설정",
  search: "검색",
  refresh: "새로고침",
  all: "전체",
  save: "저장",
  cancel: "취소",
  close: "닫기",
  edit: "수정",
  details: "상세 보기",
  addCourse: "강의 등록",
  loading: "불러오는 중입니다",
  retry: "다시 시도",
  empty: "표시할 항목이 없습니다.",
} as const;

export const adminText = {
  reference: "원문 보기",
  courseAddress: "강의 주소",
  noRefund: "—",
} as const;

/** 제작용 슬롯 표시. 브랜드 화면 문구는 각 브랜드에서 자유롭게 정한다. */
export const siteText = {
  pages: {
    home: "홈",
    courses: "강의 목록",
    "course-detail": "강의 상세",
    products: "자료·전자책",
    "product-detail": "상품 상세",
    "my-products": "내 자료",
    checkout: "수강 신청",
    "checkout-result": "결제 결과",
    learn: "강의실",
    login: "로그인",
    signup: "회원가입",
    account: "마이페이지",
    "my-courses": "내 강의실",
    orders: "결제 내역",
    "order-detail": "결제 상세",
    certificate: "수료증",
    notices: "공지사항",
    "notice-detail": "공지",
  },
} as const;
