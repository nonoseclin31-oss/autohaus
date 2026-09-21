import { cache } from "react";
import { prisma } from "./prisma";
import { COMPANY } from "./utils";

/**
 * The company details as they should appear on the site.
 *
 * COMPANY in lib/utils holds the defaults the app ships with. Anything the
 * back office has changed is stored in Setting and wins here — so the contact
 * address, the phone number and the e-mail can be corrected without a deploy,
 * which is what you want the day the showroom moves.
 *
 * `cache` keeps it to one query per request however many components ask.
 */

/** The constants are `as const`, so widen them before anything overrides. */
export type Company = { -readonly [K in keyof typeof COMPANY]: string } & LegalDetails;

/** What the Impressum needs beyond the address. Empty until filled in. */
export type LegalDetails = {
  registerCourt: string;
  registerNumber: string;
  managingDirector: string;
  vatId: string;
};

const LEGAL_DEFAULTS: LegalDetails = {
  registerCourt: "",
  registerNumber: "",
  managingDirector: "",
  vatId: "",
};

/** The keys the back office may override. The rest are not editable. */
export const EDITABLE_KEYS = [
  "email",
  "phone",
  "street",
  "postalCode",
  "city",
  "country",
  // Required on the Impressum by German law (DDG §5). They live here rather
  // than in the code because a managing director changes and a VAT number
  // arrives after registration.
  "registerCourt",
  "registerNumber",
  "managingDirector",
  "vatId",
] as const;

export type EditableKey = (typeof EDITABLE_KEYS)[number];

const PREFIX = "company.";

export const getCompany = cache(async (): Promise<Company> => {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await prisma.setting.findMany({
      where: { key: { startsWith: PREFIX } },
      select: { key: true, value: true },
    });
  } catch {
    // The site must still render if the database is unreachable; it simply
    // falls back to the values it shipped with.
  }

  const overrides: Partial<Record<EditableKey, string>> = {};
  for (const row of rows) {
    const key = row.key.slice(PREFIX.length) as EditableKey;
    if ((EDITABLE_KEYS as readonly string[]).includes(key) && row.value.trim()) {
      overrides[key] = row.value.trim();
    }
  }

  const merged = { ...COMPANY, ...LEGAL_DEFAULTS, ...overrides };

  return {
    ...merged,
    // Derived rather than stored: a stale map query is worse than none.
    mapsQuery: `${merged.street}, ${merged.postalCode} ${merged.city}, ${merged.country}`,
  };
});

/** The stored overrides on their own, for the back-office form. */
export async function getCompanyOverrides(): Promise<Partial<Record<EditableKey, string>>> {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: PREFIX } },
    select: { key: true, value: true },
  });
  const out: Partial<Record<EditableKey, string>> = {};
  for (const row of rows) {
    const key = row.key.slice(PREFIX.length) as EditableKey;
    if ((EDITABLE_KEYS as readonly string[]).includes(key)) out[key] = row.value;
  }
  return out;
}

export const settingKey = (key: EditableKey) => `${PREFIX}${key}`;
