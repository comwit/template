import type { StorybookConfig } from "@storybook/nextjs-vite";
import { fileURLToPath } from "node:url";
const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    const mockRoot = fileURLToPath(
      new URL("../src/stories/mocks", import.meta.url),
    );
    const existingAliases = config.resolve?.alias ?? [];
    config.resolve = {
      ...config.resolve,
      alias: [
        // Exact public API boundaries only. The real state modules remain unchanged.
        {
          find: /^@\/services\/(app|admin)\/api\/([^/]+)(?:\/index(?:\.ts)?)?$/,
          replacement: mockRoot + "/$1-api/$2.ts",
        },
        {
          find: /^@\/lib\/auth-client\/(app|admin)$/,
          replacement: mockRoot + "/auth-client.ts",
        },
        {
          find: "@tosspayments/tosspayments-sdk",
          replacement: mockRoot + "/payment-sdk.ts",
        },
        ...(Array.isArray(existingAliases)
          ? existingAliases
          : Object.entries(existingAliases).map(([find, replacement]) => ({
              find,
              replacement,
            }))),
        {
          find: "@",
          replacement: fileURLToPath(new URL("../src", import.meta.url)),
        },
      ],
    };
    config.plugins = [
      ...(config.plugins ?? []),
      {
        name: "storybook-api-boundary",
        enforce: "pre",
        load(id) {
          if (/\/src\/services\/(app|admin)\/api\//.test(id)) {
            throw new Error(
              "Storybook must import the mocked public API index: " + id,
            );
          }
        },
      },
    ];
    return config;
  },
};
export default config;
