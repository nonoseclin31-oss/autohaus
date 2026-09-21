/** Small shared helpers (no React, safe on both sides). */

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** AM-2603-4F7K style stock reference. */
export function generateReference(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X");
  return `AM-${mm}${yy}-${rand}`;
}

export function parseJsonArray<T = string>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function toInt(value: FormDataEntryValue | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number.parseInt(String(value).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function toFloat(value: FormDataEntryValue | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function toStr(value: FormDataEntryValue | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export function toBool(value: FormDataEntryValue | null | undefined): boolean {
  return value === "on" || value === "true" || value === "1";
}

export function toDate(value: FormDataEntryValue | null | undefined): Date | null {
  const s = toStr(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Estimate a monthly long-term rental payment from a list price. */
export function estimateMonthly(
  price: number,
  months: number,
  annualKm: number,
  deposit = 0,
): number {
  const depreciationRate = 0.42 + (months / 60) * 0.18 + (annualKm - 15000) / 300000;
  const residual = Math.max(0.18, 1 - Math.min(0.82, depreciationRate));
  const financed = Math.max(0, price - deposit);
  const depreciation = financed * (1 - residual);
  const interest = financed * 0.049 * (months / 24);
  const services = months * 38;
  return Math.max(99, Math.round((depreciation + interest + services) / months / 5) * 5);
}

export const RENTAL_DURATIONS = [24, 36, 48, 60] as const;
export const RENTAL_MILEAGES = [10000, 15000, 20000, 25000, 30000] as const;

/** Company details, shown across the site and in structured data. */
export const COMPANY = {
  legalName: "Autohaus Motion GmbH",
  shortName: "Autohaus Motion",
  street: "Bundesstraße 124",
  postalCode: "52159",
  city: "Roetgen",
  country: "Germany",
  countryCode: "DE",
  phone: "+49 2471 000 000",
  email: "contact@autohaus-motion.de",
  mapsQuery: "Bundesstraße 124, 52159 Roetgen, Germany",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://autohaus-motion.com",
} as const;
