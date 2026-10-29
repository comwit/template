import type { Decorator } from "@storybook/nextjs-vite";
import { AdminLayoutContent } from "@/services/admin/page/layout/content";

export const adminPageDecorators: Decorator[] = [
  (Story) => (
    <AdminLayoutContent>
      <Story />
    </AdminLayoutContent>
  ),
];
export function adminPageParameters(pathname: string) {
  return {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname } },
  };
}
