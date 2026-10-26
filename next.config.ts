import type { NextConfig } from "next";
import { readAppVersion } from "./scripts/app-version.mjs";
import { createRequire } from "node:module";
import { withServerFn } from "./src/lib/server-action/next";

const require = createRequire(import.meta.url);

const appVersion = readAppVersion();
const STATIC_SHELL_CACHE_SECONDS = 365 * 24 * 60 * 60;

const nextConfig: NextConfig = {
  // Comwit Cloud's brrrd build adapter emits dist/brrrd during `next build`.
  adapterPath: require.resolve("@brrrd/adapter"),
  // Keep libSQL's websocket implementation outside the server bundle. The
  // brrrd runtime loads it from the packaged node_modules tree.
  serverExternalPackages: ["@libsql/isomorphic-ws"],
  reactStrictMode: false,
  deploymentId: appVersion,
  // Cache Components separates reusable static shells/RSC payloads from
  // request-time data. Partial Prefetching then fetches only the reusable shell.
  cacheComponents: true,
  // generateMetadata 가 데이터를 읽는 화면(상품 상세 등)은 메타데이터가 스트리밍된다. 카카오톡(kakaotalk-scrap)·
  // 다음(Daum)·네이버(Yeti)는 Next 기본 봇 목록에 없어 og 태그가 <head> 밖으로 나가므로 기본 목록에 더해 차단 렌더를 받게 한다.
  htmlLimitedBots:
    /kakaotalk-scrap|Daum|Yeti|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|googleweblight/i,
  partialPrefetching: true,
  // 프리뷰가 localhost가 아닌 다른 호스트(관리형 환경 도메인)로 열릴 때, dev 서버가
  // HMR·스크립트 등 dev 리소스 요청을 cross-origin으로 차단하는 문제를 방지한다.
  // '**'는 중첩 서브도메인(a.b.mvpstar.net 등)까지 매칭한다.
  allowedDevOrigins: [
    "**.comwit.io",
    "**.mvpstar.ai",
  ],
  experimental: {
    // 서비스 레이아웃의 클라이언트 셸이 세션을 `.suspend()`로 받으므로 암묵 instant 검증이
    // 하위 페이지마다 "Could not validate instant" 경고를 낸다. `instant`를 명시한 세그먼트만 검증한다.
    instantInsights: {
      validationLevel: "manual-warning",
    },
    // Reuse static RSC payloads for the lifetime of this deployment. Dynamic
    // payloads always revalidate, matching the service worker's cache boundary.
    staleTimes: {
      dynamic: 0,
      static: STATIC_SHELL_CACHE_SECONDS,
    },
    serverActions: {
      bodySizeLimit: "100mb", // 기본값 1mb에서 100mb로 증가 (대용량 이미지 업로드 등을 위해)
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/version.json",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default withServerFn(nextConfig);
