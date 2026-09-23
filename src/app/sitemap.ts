import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { LOCALES, LOCALE_META } from "@/i18n";
import { absoluteAsset, FALLBACK_LOCALE } from "@/lib/seo";
import { COMPANY } from "@/lib/utils";

/**
 * The public surface, in every language.
 *
 * Without this the ~100 URLs are discoverable only by crawling, and a listing
 * that is sold and removed lingers. Each entry carries its own language
 * alternates so the six versions of a page are understood as one page rather
 * than six competing ones, and each listing names its photos so they can be
 * found in image search.
 *
 * The legal pages are left out: they are kept out of the index on purpose.
 */

export const dynamic = "force-dynamic";

type Frequency = MetadataRoute.Sitemap[number]["changeFrequency"];

/** Photos per listing named in the sitemap; the gallery has the rest. */
const IMAGES_PER_LISTING = 6;

function languagesFor(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [LOCALE_META[l].htmlLang, `${COMPANY.siteUrl}/${l}${path}`])),
    "x-default": `${COMPANY.siteUrl}/${FALLBACK_LOCALE}${path}`,
  };
}

function entries(
  path: string,
  priority: number,
  changeFrequency: Frequency,
  lastModified?: Date,
  images?: string[],
): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${COMPANY.siteUrl}/${locale}${path}`,
    // Only stated when it is known. A date that is always "now" teaches a
    // search engine to ignore the field altogether.
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
    alternates: { languages: languagesFor(path) },
    ...(images?.length ? { images } : {}),
  }));
}

type Listing = { slug: string; updatedAt: Date; images: { url: string }[] };

const LISTING_SELECT = {
  slug: true,
  updatedAt: true,
  images: { orderBy: [{ isCover: "desc" as const }, { position: "asc" as const }], take: IMAGES_PER_LISTING, select: { url: true } },
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only what a visitor can actually reach. A draft or an unpublished listing
  // would be a soft 404 for anyone following the link.
  let vehicles: Listing[] = [];
  let toys: Listing[] = [];
  try {
    [vehicles, toys] = await Promise.all([
      prisma.vehicle.findMany({ where: { published: true }, select: LISTING_SELECT, orderBy: { updatedAt: "desc" } }),
      prisma.toy.findMany({ where: { published: true }, select: LISTING_SELECT, orderBy: { updatedAt: "desc" } }),
    ]);
  } catch {
    // A sitemap missing its listings still beats no sitemap at all.
  }

  // The catalogue pages change when a listing does.
  const carsChanged = vehicles[0]?.updatedAt;
  const toysChanged = toys[0]?.updatedAt;
  const anyChanged = [carsChanged, toysChanged].filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0];

  return [
    ...entries("", 1, "daily", anyChanged),
    ...entries("/vehicles", 0.9, "daily", carsChanged),
    ...entries("/big-toys", 0.8, "daily", toysChanged),
    ...entries("/rental", 0.8, "weekly"),
    ...entries("/about", 0.5, "monthly"),
    ...entries("/contact", 0.6, "monthly"),
    ...vehicles.flatMap((v) =>
      entries(`/vehicles/${v.slug}`, 0.8, "weekly", v.updatedAt, v.images.map((i) => absoluteAsset(i.url))),
    ),
    ...toys.flatMap((t) =>
      entries(`/big-toys/${t.slug}`, 0.8, "weekly", t.updatedAt, t.images.map((i) => absoluteAsset(i.url))),
    ),
  ];
}
