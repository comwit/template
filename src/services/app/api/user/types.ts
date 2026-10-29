export type User = {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  displayUsername?: string | null;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface UserAPI {
  /** 현재 로그인한 사용자 정보 조회 */
  getMe: () => Promise<User | null>;
}
