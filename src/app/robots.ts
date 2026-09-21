import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/utils";

/**
 * Crawlers get the whole public site and nothing else. The back office is
 * already noindex, but there is no reason to spend crawl budget on it, and
 * /api serves no pages at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/*/admin", "/*/login"],
      },
    ],
    sitemap: `${COMPANY.siteUrl}/sitemap.xml`,
    host: COMPANY.siteUrl,
  };
}
