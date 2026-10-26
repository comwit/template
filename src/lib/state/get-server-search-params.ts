import { workUnitAsyncStorage } from 'next/dist/server/app-render/work-unit-async-storage.external.js'

/** Next 16.3의 요청별 저장소(비공개 모듈, 업그레이드 때 검증). 사전 렌더링에서는 브라우저 초기화를 기다린다. */
export function getServerSearchParams(): string | null {
  if (typeof window !== 'undefined') return null
  const store = workUnitAsyncStorage.getStore()
  return store?.type === 'request' ? store.url.search : null
}
