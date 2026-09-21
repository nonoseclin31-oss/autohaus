import type { Metadata } from "next";
import { LOCALES, LOCALE_META, DEFAULT_LOCALE } from "@/i18n";
import { COMPANY } from "@/lib/utils";

/**
 * Canonical and hreflang links for one page.
 *
 * Next merges most metadata from a layout into its pages, but `alternates` is
 * replaced wholesale rather than merged — so a page that sets a title and
 * nothing else inherits the layout's canonical, which points at the locale's
 * home page. Every page below the locale layout therefore has to state its own
 * path, or search engines are told the whole site is one page.
 *
 * `path` is the route below the locale, with a leading slash and no locale
 * prefix: "/vehicles", "/vehicles/porsche-911-am-0126-a1x9", or "" for home.
 */
export function pageAlternates(locale: string, path = ""): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [LOCALE_META[l].htmlLang, `/${l}${path}`])),
      "x-default": `/${DEFAULT_LOCALE}${path}`,
    },
  };
}

/** Absolute URL for a page, for structured data and sitemaps. */
export function absoluteUrl(locale: string, path = ""): string {
  return `${COMPANY.siteUrl}/${locale}${path}`;
}

/* ───────────────────────── Structured data ───────────────────────── */

const FUEL_SCHEMA: Record<string, string> = {
  PETROL: "Gasoline",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  PLUGIN_HYBRID: "Plug-in hybrid",
  ELECTRIC: "Electric",
  LPG: "LPG",
  CNG: "CNG",
};

const TRANSMISSION_SCHEMA: Record<string, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
  DUAL_CLUTCH: "Dual-clutch",
  CVT: "CVT",
};

/** Sale status → schema.org availability. */
const AVAILABILITY: Record<string, string> = {
  AVAILABLE: "https://schema.org/InStock",
  RESERVED: "https://schema.org/PreOrder",
  SOLD: "https://schema.org/SoldOut",
  COMING_SOON: "https://schema.org/PreOrder",
};

/** The dealership itself: what a local search result is built from. */
export function dealerSchema(
  locale: string,
  description: string,
  /** Resolved contact details; the constants are only the defaults. */
  company: { legalName: string; shortName: string; phone: string; email: string; street: string; postalCode: string; city: string; countryCode: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": `${COMPANY.siteUrl}/#dealer`,
    name: company.legalName,
    alternateName: company.shortName,
    description,
    url: absoluteUrl(locale),
    logo: `${COMPANY.siteUrl}/brand/logo-full.png`,
    image: `${COMPANY.siteUrl}/brand/logo-full.png`,
    telephone: company.phone,
    email: company.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.street,
      postalCode: company.postalCode,
      addressLocality: company.city,
      addressCountry: company.countryCode,
    },
    // The showroom is in Germany, but cars are sourced beyond Europe and
    // shipped anywhere, so the served area is not a region.
    areaServed: "Worldwide",
    currenciesAccepted: "EUR",
  };
}

type SchemaVehicle = {
  slug: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  vin: string | null;
  mileage: number;
  fuel: string;
  transmission: string;
  powerHp: number;
  doors: number | null;
  seats: number | null;
  colorExterior: string | null;
  condition: string;
  price: number;
  status: string;
  images: { url: string }[];
};

/**
 * One listing, as a Vehicle with an Offer. This is what puts the price,
 * mileage and year under the result instead of a bare blue link.
 */
export function vehicleSchema(locale: string, vehicle: SchemaVehicle, description: string) {
  const name = [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ");
  return {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name,
    description,
    url: absoluteUrl(locale, `/vehicles/${vehicle.slug}`),
    image: vehicle.images.map((image) => image.url).slice(0, 8),
    brand: { "@type": "Brand", name: vehicle.brand },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    ...(vehicle.vin ? { vehicleIdentificationNumber: vehicle.vin } : {}),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: "KMT" },
    fuelType: FUEL_SCHEMA[vehicle.fuel] ?? vehicle.fuel,
    vehicleTransmission: TRANSMISSION_SCHEMA[vehicle.transmission] ?? vehicle.transmission,
    vehicleEngine: { "@type": "EngineSpecification", enginePower: { "@type": "QuantitativeValue", value: vehicle.powerHp, unitCode: "BHP" } },
    ...(vehicle.doors ? { numberOfDoors: vehicle.doors } : {}),
    ...(vehicle.seats ? { seatingCapacity: vehicle.seats } : {}),
    ...(vehicle.colorExterior ? { color: vehicle.colorExterior } : {}),
    itemCondition: vehicle.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      price: vehicle.price,
      priceCurrency: "EUR",
      availability: AVAILABILITY[vehicle.status] ?? "https://schema.org/InStock",
      itemCondition: vehicle.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      url: absoluteUrl(locale, `/vehicles/${vehicle.slug}`),
      seller: { "@id": `${COMPANY.siteUrl}/#dealer` },
    },
  };
}

/** Where the page sits, so results show a path rather than a raw URL. */
export function breadcrumbSchema(locale: string, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(locale, step.path),
    })),
  };
}
