import type { Metadata } from "next";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n";
import { COLORS, label, type Locale as TaxLocale } from "@/lib/taxonomy";
import { COMPANY } from "@/lib/utils";

export const SITE_NAME = "Autohaus Motion";

/**
 * The language a visitor gets when theirs is not one of the six.
 *
 * English rather than the back office's French: someone reading Italian,
 * Dutch or Russian is far more likely to read English. The middleware makes
 * the same choice for a first visit, and hreflang's x-default says so to
 * search engines — the two have to agree.
 */
export const FALLBACK_LOCALE: Locale = "en";

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
      "x-default": `/${FALLBACK_LOCALE}${path}`,
    },
  };
}

type Query = Record<string, string | string[] | undefined>;

function laterPage(sp: Query): number | null {
  const keys = Object.keys(sp).filter((key) => sp[key] !== undefined && sp[key] !== "");
  if (keys.length !== 1 || keys[0] !== "page" || typeof sp.page !== "string") return null;
  const page = Number.parseInt(sp.page, 10);
  return Number.isFinite(page) && page > 1 ? page : null;
}

/**
 * The canonical path of a catalogue page.
 *
 * A filtered or sorted view is the same catalogue seen another way, so it
 * points back to the catalogue. A later page of the plain catalogue is a page
 * of its own — Google asks for that, so the cars listed only there are not
 * treated as if nothing linked to them.
 */
export function listingPath(base: string, sp: Query): string {
  const page = laterPage(sp);
  return page ? `${base}?page=${page}` : base;
}

/** "Voitures à vendre — Page 2": later pages must not share page one's title. */
export function pagedTitle(title: string, sp: Query, pageWord: string): string {
  const page = laterPage(sp);
  return page ? `${title} — ${pageWord} ${page}` : title;
}

/** Absolute URL for a page, for structured data and sitemaps. */
export function absoluteUrl(locale: string, path = ""): string {
  return `${COMPANY.siteUrl}/${locale}${path}`;
}

/**
 * Absolute URL for a photo. Uploads live on the storage bucket with a full
 * address already; the sample pictures are served by the site itself and
 * stored as a path, which structured data and sitemaps do not accept.
 */
export function absoluteAsset(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${COMPANY.siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * The picture a shared link shows: the listing's photo when there is one a
 * preview can display — WhatsApp, LinkedIn and the rest render no SVG — and
 * the site's own card otherwise.
 */
function shareImages(image: string | null | undefined) {
  if (image && !/\.svg(\?|$)/i.test(image)) {
    const url = absoluteAsset(image);
    return { og: [url], twitter: [url] };
  }
  return {
    og: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: SITE_NAME, type: "image/png" }],
    twitter: [{ url: "/twitter-image.png", width: 1200, height: 630, alt: SITE_NAME, type: "image/png" }],
  };
}

/** Open Graph wants language_TERRITORY, not a bare language. */
const OG_LOCALE: Record<Locale, string> = {
  en: "en_GB",
  fr: "fr_FR",
  de: "de_DE",
  zh: "zh_CN",
  ar: "ar_AE",
  es: "es_ES",
};

/**
 * Everything a page tells search engines and link previews about itself.
 *
 * Open Graph and Twitter are restated on every page because Next replaces
 * them wholesale too: a page that only set a title used to be shared on
 * WhatsApp or LinkedIn with the home page's title, text and address — and a
 * page that sets them loses the site's card unless it names it again.
 *
 * `title` is the page's own part; the layout's template adds the brand. Pass
 * `absoluteTitle` when the title already carries it (the home page).
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  absoluteTitle = false,
  noindex = false,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  /** A photo of the thing on the page. Without one, the site's own card is used. */
  image?: string | null;
  absoluteTitle?: boolean;
  noindex?: boolean;
}): Metadata {
  const shareTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  const images = shareImages(image);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: pageAlternates(locale, path),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: shareTitle,
      description,
      url: `/${locale}${path}`,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: images.og,
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: images.twitter,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * A snippet of at most `max` characters, cut between words.
 *
 * Descriptions are written as paragraphs; a search result shows about 155
 * characters of one line. Chinese has no spaces to cut at and carries more
 * per character, so it is cut on the character and kept shorter.
 */
export function clip(text: string, locale: Locale, max = 158): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const limit = locale === "zh" ? Math.min(max, 90) : max;
  if (flat.length <= limit) return flat;
  if (locale === "zh") return `${flat.slice(0, limit - 1)}…`;
  const cut = flat.slice(0, limit - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:—–-]+$/, "")}…`;
}

/**
 * A listing's snippet: its figures first — what a buyer scans a result for —
 * then its own words when it has them in this language, or a closing line
 * when it does not. A description written in another language is left out:
 * a French result with an English sentence in it reads as a mistake.
 */
export function listingSnippet(locale: Locale, facts: (string | null)[], ownWords: string | null | undefined, suffix: string): string {
  const stop = locale === "zh" ? "。" : ". ";
  const lead = facts.filter(Boolean).join(" · ");
  return clip(`${lead}${stop}${ownWords?.trim() || suffix}`, locale);
}

/** The listing's description in exactly this language, if one was written. */
export function ownDescription(
  translations: { locale: string; description: string | null }[],
  locale: Locale,
): string | null {
  return translations.find((row) => row.locale === locale && row.description?.trim())?.description ?? null;
}

/** "{name} à vendre" and its five siblings, filled in. */
export function fill(template: string, name: string): string {
  return template.replace("{name}", name);
}

/* ───────────────────────── Structured data ───────────────────────── */

/**
 * The showroom's hours, as the contact page shows them. Sunday is by
 * appointment, which schema.org has no way to say, so it is left out.
 */
export const OPENING_HOURS = [
  { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:30" },
  { days: ["Saturday"], opens: "10:00", closes: "16:00" },
] as const;

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
  DCT: "Dual-clutch",
  CVT: "CVT",
  DIRECT: "Direct drive",
};

const DRIVE_SCHEMA: Record<string, string> = {
  FWD: "https://schema.org/FrontWheelDriveConfiguration",
  RWD: "https://schema.org/RearWheelDriveConfiguration",
  AWD: "https://schema.org/AllWheelDriveConfiguration",
  FOUR_WD: "https://schema.org/FourWheelDriveConfiguration",
};

/** Sale status → schema.org availability. */
const AVAILABILITY: Record<string, string> = {
  AVAILABLE: "https://schema.org/InStock",
  RESERVED: "https://schema.org/LimitedAvailability",
  SOLD: "https://schema.org/SoldOut",
  COMING_SOON: "https://schema.org/PreOrder",
};

const CONDITION_SCHEMA = (condition: string) =>
  condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition";

const DEALER_ID = `${COMPANY.siteUrl}/#dealer`;
const WEBSITE_ID = `${COMPANY.siteUrl}/#website`;

type DealerCompany = {
  legalName: string;
  shortName: string;
  phone: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  mapsQuery: string;
};

/** The dealership itself: what a local search result is built from. */
export function dealerSchema(locale: string, description: string, company: DealerCompany) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": DEALER_ID,
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
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.mapsQuery)}`,
    openingHoursSpecification: OPENING_HOURS.map((slot) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: slot.days.map((day) => `https://schema.org/${day}`),
      opens: slot.opens,
      closes: slot.closes,
    })),
    // The showroom is in Germany, but cars are sourced beyond Europe and
    // shipped anywhere, so the served area is not a region.
    areaServed: "Worldwide",
    currenciesAccepted: "EUR",
    availableLanguage: LOCALES.map((l) => LOCALE_META[l].english),
  };
}

/**
 * The site as a whole. This is what Google reads the site name from — the
 * words above the address in a result — instead of guessing from the title.
 */
export function websiteSchema(locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: [COMPANY.legalName, "autohausmotion.com"],
    url: `${COMPANY.siteUrl}/`,
    description,
    inLanguage: LOCALES.map((l) => LOCALE_META[l].htmlLang),
    publisher: { "@id": DEALER_ID },
  };
}

function offer(url: string, price: number, status: string, condition: string) {
  return {
    "@type": "Offer",
    price,
    priceCurrency: "EUR",
    availability: AVAILABILITY[status] ?? "https://schema.org/InStock",
    itemCondition: CONDITION_SCHEMA(condition),
    url,
    seller: { "@id": DEALER_ID },
  };
}

type SchemaVehicle = {
  slug: string;
  reference: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  vin: string | null;
  bodyType: string;
  mileage: number;
  fuel: string;
  transmission: string;
  drivetrain: string | null;
  powerHp: number;
  doors: number | null;
  seats: number | null;
  colorExterior: string | null;
  colorInterior: string | null;
  previousOwners: number | null;
  firstRegistration: Date | null;
  condition: string;
  price: number;
  status: string;
  images: { url: string }[];
};

/**
 * One listing, as a Car that is also a Product with an Offer. The Car half
 * carries the mileage, year and power; the Product half is what Google needs
 * to put the price and availability under the result.
 */
export function vehicleSchema(locale: Locale, vehicle: SchemaVehicle, description: string, bodyLabel: string) {
  const name = [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ");
  const url = absoluteUrl(locale, `/vehicles/${vehicle.slug}`);
  const tax = locale as TaxLocale;
  return {
    "@context": "https://schema.org",
    "@type": ["Car", "Product"],
    name,
    description,
    url,
    sku: vehicle.reference,
    image: vehicle.images.map((image) => absoluteAsset(image.url)).slice(0, 8),
    brand: { "@type": "Brand", name: vehicle.brand },
    manufacturer: { "@type": "Organization", name: vehicle.brand },
    model: vehicle.model,
    ...(vehicle.version ? { vehicleConfiguration: vehicle.version } : {}),
    vehicleModelDate: String(vehicle.year),
    ...(vehicle.firstRegistration
      ? { dateVehicleFirstRegistered: vehicle.firstRegistration.toISOString().slice(0, 10) }
      : {}),
    ...(vehicle.vin ? { vehicleIdentificationNumber: vehicle.vin } : {}),
    bodyType: bodyLabel,
    mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: "KMT" },
    fuelType: FUEL_SCHEMA[vehicle.fuel] ?? vehicle.fuel,
    vehicleTransmission: TRANSMISSION_SCHEMA[vehicle.transmission] ?? vehicle.transmission,
    ...(vehicle.drivetrain && DRIVE_SCHEMA[vehicle.drivetrain]
      ? { driveWheelConfiguration: DRIVE_SCHEMA[vehicle.drivetrain] }
      : {}),
    vehicleEngine: {
      "@type": "EngineSpecification",
      enginePower: { "@type": "QuantitativeValue", value: vehicle.powerHp, unitCode: "BHP" },
    },
    ...(vehicle.doors ? { numberOfDoors: vehicle.doors } : {}),
    ...(vehicle.seats ? { seatingCapacity: vehicle.seats } : {}),
    ...(vehicle.previousOwners !== null ? { numberOfPreviousOwners: vehicle.previousOwners } : {}),
    ...(vehicle.colorExterior ? { color: label(COLORS, vehicle.colorExterior, tax) } : {}),
    ...(vehicle.colorInterior ? { vehicleInteriorColor: label(COLORS, vehicle.colorInterior, tax) } : {}),
    itemCondition: CONDITION_SCHEMA(vehicle.condition),
    offers: offer(url, vehicle.price, vehicle.status, vehicle.condition),
  };
}

type SchemaToy = {
  slug: string;
  reference: string;
  kind: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  hullId: string | null;
  engineType: string;
  transmission: string | null;
  powerHp: number;
  mileage: number | null;
  seats: number | null;
  colorExterior: string | null;
  condition: string;
  price: number;
  status: string;
  images: { url: string }[];
};

/**
 * One Big Toys listing. A motorcycle is a Motorcycle; a quad, a jet ski or a
 * boat is a Vehicle (schema.org's word covers land and water alike); an
 * accessory is only a Product.
 */
export function toySchema(locale: Locale, toy: SchemaToy, description: string, kindLabel: string) {
  const name = [toy.brand, toy.model, toy.version].filter(Boolean).join(" ");
  const url = absoluteUrl(locale, `/big-toys/${toy.slug}`);
  const accessory = toy.kind === "ACCESSORY";
  const types = accessory ? "Product" : [toy.kind === "MOTORCYCLE" ? "Motorcycle" : "Vehicle", "Product"];
  return {
    "@context": "https://schema.org",
    "@type": types,
    name,
    description,
    url,
    sku: toy.reference,
    category: kindLabel,
    image: toy.images.map((image) => absoluteAsset(image.url)).slice(0, 8),
    brand: { "@type": "Brand", name: toy.brand },
    model: toy.model,
    ...(accessory
      ? {}
      : {
          vehicleModelDate: String(toy.year),
          ...(toy.hullId ? { vehicleIdentificationNumber: toy.hullId } : {}),
          fuelType: FUEL_SCHEMA[toy.engineType] ?? toy.engineType,
          ...(toy.transmission ? { vehicleTransmission: TRANSMISSION_SCHEMA[toy.transmission] ?? toy.transmission } : {}),
          vehicleEngine: {
            "@type": "EngineSpecification",
            enginePower: { "@type": "QuantitativeValue", value: toy.powerHp, unitCode: "BHP" },
          },
          ...(toy.mileage !== null
            ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: toy.mileage, unitCode: "KMT" } }
            : {}),
          ...(toy.seats ? { seatingCapacity: toy.seats } : {}),
        }),
    ...(toy.colorExterior ? { color: label(COLORS, toy.colorExterior, locale as TaxLocale) } : {}),
    itemCondition: CONDITION_SCHEMA(toy.condition),
    offers: offer(url, toy.price, toy.status, toy.condition),
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

/**
 * Questions and answers exactly as the page shows them. Google keeps the
 * FAQ result for a few kinds of site, but assistants and other engines
 * still read the pairs, and they cost nothing when they match the page.
 */
export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** The long-term rental offer, as a service the dealership provides. */
export function rentalServiceSchema(locale: Locale, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType: "Long-term car rental",
    url: absoluteUrl(locale, "/rental"),
    provider: { "@id": DEALER_ID },
  };
}
