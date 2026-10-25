/**
 * Shared site SEO configuration (single source of truth).
 *
 * Changing these values updates global metadata, OG, Twitter, and JSON-LD.
 * Use buildMetadata({ ... }) for individual page overrides.
 */
export const siteConfig = {
  /** Site/service name used by the title template, siteName, and JSON-LD. */
  name: "MVPStar Template",
  /** Default title. */
  title: "MVPStar Template",
  /** Default description for search results and OG. */
  description:
    "MVPStar에서 제작한 빠른 MVP 개발 템플릿입니다. Next.js 16 기반으로 구축되어 아이디어를 신속하게 실현할 수 있습니다.",
  /** OG image path: public/og.png (recommended: 1200×630). */
  ogImage: "/og.png",
  /** Content language/region (e.g. ko_KR, en_US). */
  locale: "ko_KR",
  /** <html lang> value (e.g. ko, en). */
  lang: "ko",
  /** Twitter handle, including @. Leave empty when unavailable. */
  twitterHandle: "",
} as const;

export type SiteConfig = typeof siteConfig;
