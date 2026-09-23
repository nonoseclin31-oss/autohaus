import { LOCALES, type Locale } from "./taxonomy";

/**
 * The parts of a team profile that are pure data — no database — so the
 * back-office form can use the very same rules in the browser: the same
 * length limits, the same age bounds, the same language fallback its
 * preview shows.
 */

/** Longest function title and introduction the form accepts. */
export const ROLE_MAX = 60;
export const TAGLINE_MAX = 160;

/** The youngest and oldest age the form will take a birth date for. */
export const AGE_MIN = 16;
export const AGE_MAX = 90;

export type AboutCopy = Partial<Record<Locale, { role?: string; tagline?: string }>>;

export function parseAboutCopy(json: string | null | undefined): AboutCopy {
  if (!json) return {};
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: AboutCopy = {};
    for (const locale of LOCALES) {
      const entry = (raw as Record<string, unknown>)[locale];
      if (!entry || typeof entry !== "object") continue;
      const { role, tagline } = entry as Record<string, unknown>;
      out[locale] = {
        ...(typeof role === "string" && role.trim() ? { role: role.trim() } : {}),
        ...(typeof tagline === "string" && tagline.trim() ? { tagline: tagline.trim() } : {}),
      };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * One field in the visitor's language, or the nearest language that has it.
 *
 * French first, because it is the language the back office is written in;
 * then English, the site's lingua franca; then whatever was filled. Writing
 * a profile once is therefore enough for all six versions of the page.
 */
export function pickCopy(copy: AboutCopy, locale: Locale, field: "role" | "tagline"): string | null {
  return pickCopyIn(copy, locale, field)?.text ?? null;
}

/**
 * The same, saying which language the text actually came from — so a French
 * line on the English page can be marked as French, and read aloud as French.
 */
export function pickCopyIn(
  copy: AboutCopy,
  locale: Locale,
  field: "role" | "tagline",
): { text: string; locale: Locale } | null {
  for (const candidate of [locale, "fr", "en", ...LOCALES] as Locale[]) {
    const text = copy[candidate]?.[field];
    if (text) return { text, locale: candidate };
  }
  return null;
}

/** Whole years between a birth date and today. */
export function ageFrom(birthDate: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayPassed =
    now.getUTCMonth() > birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayPassed) age--;
  return age;
}

/**
 * Reads a birth date typed in the form (YYYY-MM-DD).
 *
 * `undefined` means "leave it as it is", `null` means "clear it". A date that
 * would make someone younger than sixteen or older than ninety is a typo —
 * the year field is where fingers slip — and is refused rather than
 * published as an age nobody has.
 */
export function readBirthDate(value: FormDataEntryValue | null): Date | null | undefined {
  if (value === null) return undefined;
  const text = String(value).trim();
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return undefined;
  const age = ageFrom(date);
  return age >= AGE_MIN && age <= AGE_MAX ? date : undefined;
}
