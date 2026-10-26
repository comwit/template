import type { MetadataRoute } from "next";
import { config } from "@/server/config";

/**
 * Generate /robots.txt (src/app/robots.ts).
 * Tell crawlers where to find the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = config.SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep the custom admin path out of public robots.txt; its layout sets noindex.
      disallow: ["/cart", "/checkout", "/account", "/api/", "/cron/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
