import { fn } from "storybook/test";

// Auth actions hard-navigate after success. Keep the canvas in place by returning
// an explicit preview response; logged-in/out screens use apiMock.data sessions.
const previewAuth = async () => ({
  data: null,
  error: {
    message:
      "스토리북 인증 예시입니다. 로그인 상태는 스토리의 apiMock.data에서 선택합니다.",
    status: 400,
    statusText: "Storybook preview",
  },
});
export const appAuth = {
  signIn: { email: fn(previewAuth) },
  signUp: { email: fn(previewAuth) },
  signOut: fn(previewAuth),
};
export const adminAuth = {
  signIn: { email: fn(previewAuth) },
  signOut: fn(previewAuth),
  changePassword: fn(async () => ({
    data: { user: null, token: null },
    error: null,
  })),
};
export function resetAuthMocks() {
  appAuth.signIn.email.mockReset();
  appAuth.signUp.email.mockReset();
  appAuth.signOut.mockReset();
  adminAuth.signIn.email.mockReset();
  adminAuth.signOut.mockReset();
  adminAuth.changePassword.mockReset();
}
