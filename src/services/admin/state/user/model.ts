import { model, query } from '@comwit/state'
import { adminUser as userApi } from '@/services/admin/api/user'
import type { User, UserState } from './types'

export const user = model<UserState>({
  // 서비스 레이아웃 셸이 요청 시점 SSR에서 me.suspend()로 받는다.
  // 화면에서는 me.data를 읽는다. 초기 로딩을 위한 me.load()/useEffect는 필요 없다.
  me: query<User | null>({
    initialData: null,
    queryFn: () => userApi.getMe(),
  }),
  isLoading: false,
})
