import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { LOCALES, LOCALE_META, DEFAULT_LOCALE } from "@/i18n";
import { COMPANY } from "@/lib/utils";

/**
 * The public surface, in every language.
 *
 * Without this the ~100 URLs are discoverable only by crawling, and a listing
 * that is sold and removed lingers. Each entry carries its own language
 * alternates so the six versions of a page are understood as one page rather
 * than six competing ones.
 */

export const dynamic = "force-dynamic";

const STATIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/vehicles", priority: 0.9, changeFrequency: "daily" },
  { path: "/rental", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/legal/imprint", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.2, changeFrequency: "yearly" },
];

function languagesFor(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [LOCALE_META[l].htmlLang, `${COMPANY.siteUrl}/${l}${path}`])),
    "x-default": `${COMPANY.siteUrl}/${DEFAULT_LOCALE}${path}`,
  };
}

function entry(
  path: string,
  locale: string,
  lastModified: Date,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
): MetadataRoute.Sitemap[number] {
  return {
    url: `${COMPANY.siteUrl}/${locale}${path}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages: languagesFor(path) },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const pages: MetadataRoute.Sitemap = STATIC_PATHS.flatMap(({ path, priority, changeFrequency }) =>
    LOCALES.map((locale) => entry(path, locale, now, priority, changeFrequency)),
  );

  // Only what a visitor can actually reach. A draft or an unpublished listing
  // would be a soft 404 for anyone following the link.
  let vehicles: { slug: string; updatedAt: Date }[] = [];
  try {
    vehicles = await prisma.vehicle.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    // A sitemap missing its listings still beats no sitemap at all.
  }

  const listings: MetadataRoute.Sitemap = vehicles.flatMap((vehicle) =>
    LOCALES.map((locale) =>
      entry(`/vehicles/${vehicle.slug}`, locale, vehicle.updatedAt, 0.8, "weekly"),
    ),
  );

  return [...pages, ...listings];
}
