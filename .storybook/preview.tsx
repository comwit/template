import type { Preview } from "@storybook/nextjs-vite";
import { OverlayProvider } from "overlay-kit";
import { Toaster } from "../src/lib/components/ui/toast";
import { PreviewState } from "../src/stories/mocks/preview-state";
import { resetApiMocks } from "../src/stories/mocks/runtime";
import { resetAuthMocks } from "../src/stories/mocks/auth-client";
import { resetPaymentMocks } from "../src/stories/mocks/payment-sdk";
import "../src/app/globals.css";
import "./preview.css";
const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "todo" },
    docs: { story: { inline: false } },
    options: {
      storySort: {
        order: [
          "쇼핑몰",
          "어드민",
          [
            "대시보드",
            "상품",
            "재고",
            "주문",
            "결제",
            "고객",
            "알림",
            "연결 설정",
            "내 계정",
            "로그인",
          ],
          "*",
        ],
      },
    },
  },
  beforeEach: ({ parameters }) => {
    resetApiMocks(parameters.apiMock);
    resetAuthMocks();
    resetPaymentMocks();
  },
  decorators: [
    (Story, context) => (
      <PreviewState key={context.id}>
        <OverlayProvider>
          <div className="min-h-dvh bg-background text-foreground">
            <Story />
            <Toaster />
          </div>
        </OverlayProvider>
      </PreviewState>
    ),
  ],
  tags: ["autodocs"],
};
export default preview;
