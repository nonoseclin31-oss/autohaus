import { LOCALES, RTL_LOCALES, type Locale } from "@/lib/taxonomy";
import en, { type Dictionary } from "./dictionaries/en";
import fr from "./dictionaries/fr";
import de from "./dictionaries/de";
import zh from "./dictionaries/zh";
import ar from "./dictionaries/ar";
import es from "./dictionaries/es";

export const DEFAULT_LOCALE: Locale = "fr";
export { LOCALES, RTL_LOCALES };
export type { Locale, Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, fr, de, zh, ar, es };

export const LOCALE_META: Record<Locale, { name: string; english: string; flag: string; dir: "ltr" | "rtl"; htmlLang: string }> = {
  en: { name: "English", english: "English", flag: "GB", dir: "ltr", htmlLang: "en" },
  fr: { name: "Français", english: "French", flag: "FR", dir: "ltr", htmlLang: "fr" },
  de: { name: "Deutsch", english: "German", flag: "DE", dir: "ltr", htmlLang: "de" },
  zh: { name: "中文", english: "Chinese", flag: "CN", dir: "ltr", htmlLang: "zh-Hans" },
  ar: { name: "العربية", english: "Arabic", flag: "SA", dir: "rtl", htmlLang: "ar" },
  es: { name: "Español", english: "Spanish", flag: "ES", dir: "ltr", htmlLang: "es" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getDictionary(locale: string | undefined | null): Dictionary {
  return dictionaries[resolveLocale(locale)];
}

export function direction(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

/** Build a localised href: localePath("fr", "/vehicles") -> "/fr/vehicles" */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/** Swap the locale segment of a pathname, keeping the rest intact. */
export function switchLocalePath(pathname: string, next: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length && isLocale(segments[0])) {
    segments[0] = next;
    return `/${segments.join("/")}`;
  }
  return `/${next}${pathname === "/" ? "" : pathname}`;
}

/** Number / currency helpers bound to a locale. */
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB", fr: "fr-FR", de: "de-DE", zh: "zh-CN", ar: "ar-AE", es: "es-ES",
};

export function formatCurrency(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Money that is only meaningful to the cent — a per-kilometre rate, where
 * whole euros would round 0,08 € to nothing.
 */
export function formatCurrencyPrecise(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(INTL_LOCALE[locale], opts).format(value);
}

export function formatDate(value: Date | string | null | undefined, locale: Locale, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], opts ?? { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatMonthYear(value: Date | string | null | undefined, locale: Locale): string {
  return formatDate(value, locale, { month: "2-digit", year: "numeric" });
}
