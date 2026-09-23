import { cache } from "react";
import { prisma } from "./prisma";
import { LOCALES, type Locale } from "./taxonomy";
import type { AboutText } from "./about-texts";

/**
 * Site-wide choices made in the back office, next to the company details:
 * whether the phone number sits in the header, and the two paragraphs that
 * present the company on the About page.
 *
 * Kept in the same Setting table as the contact details, under their own
 * prefixes, and read the same way: one query per request however many
 * components ask, and the defaults the site ships with whenever nothing has
 * been stored or the database cannot be reached.
 */

const HEADER_PHONE_KEY = "site.headerPhone";

export { ABOUT_TEXTS, ABOUT_TEXT_MAX, aboutTextKey } from "./about-texts";
export type { AboutText } from "./about-texts";

export type SiteSettings = {
  /** Show the company phone number in the site header. On unless switched off. */
  headerPhone: boolean;
  /** Rewritten About paragraphs, by language. Missing means the original text. */
  about: Partial<Record<Locale, Partial<Record<AboutText, string>>>>;
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await prisma.setting.findMany({
      where: { OR: [{ key: HEADER_PHONE_KEY }, { key: { startsWith: "about." } }] },
      select: { key: true, value: true },
    });
  } catch {
    // Unreachable database: the site renders with what it shipped with.
  }

  const settings: SiteSettings = { headerPhone: true, about: {} };
  for (const row of rows) {
    if (row.key === HEADER_PHONE_KEY) {
      settings.headerPhone = row.value !== "0";
      continue;
    }
    const match = /^about\.(body1|body2)\.([a-z]+)$/.exec(row.key);
    if (!match || !(LOCALES as readonly string[]).includes(match[2])) continue;
    const text = row.value.trim();
    if (!text) continue;
    const locale = match[2] as Locale;
    settings.about[locale] = { ...settings.about[locale], [match[1] as AboutText]: text };
  }
  return settings;
});

export { HEADER_PHONE_KEY };
