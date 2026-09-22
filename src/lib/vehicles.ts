import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { Locale } from "./taxonomy";
import { parseJsonArray } from "./utils";

export type VehicleListItem = {
  id: string;
  slug: string;
  reference: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  bodyType: string;
  condition: string;
  powerHp: number;
  price: number;
  oldPrice: number | null;
  vatDeductible: boolean;
  status: string;
  featured: boolean;
  rentalAvailable: boolean;
  rentalMonthly: number | null;
  colorExterior: string | null;
  coverUrl: string | null;
  imageCount: number;
  headline: string | null;
};

const LIST_SELECT = {
  id: true, slug: true, reference: true, brand: true, model: true, version: true,
  year: true, mileage: true, fuel: true, transmission: true, bodyType: true,
  condition: true, powerHp: true, price: true, oldPrice: true, vatDeductible: true,
  status: true, featured: true, rentalAvailable: true, rentalMonthly: true,
  colorExterior: true,
  images: { orderBy: [{ isCover: "desc" }, { position: "asc" }], select: { url: true } },
  translations: { select: { locale: true, headline: true } },
} satisfies Prisma.VehicleSelect;

type RawListRow = {
  images: { url: string }[];
  translations: { locale: string; headline: string | null }[];
} & Omit<VehicleListItem, "coverUrl" | "imageCount" | "headline">;

function toListItem(row: RawListRow, locale: Locale): VehicleListItem {
  const { images, translations, ...rest } = row;
  const tr = translations.find((t) => t.locale === locale) ?? translations.find((t) => t.locale === "en");
  return {
    ...rest,
    coverUrl: images[0]?.url ?? null,
    imageCount: images.length,
    headline: tr?.headline ?? null,
  };
}

export type VehicleFilters = {
  brand?: string;
  model?: string;
  bodyType?: string;
  fuel?: string;
  transmission?: string;
  condition?: string;
  segment?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  powerMin?: number;
  availableOnly?: boolean;
  rentalOnly?: boolean;
  q?: string;
  sort?: string;
  page?: number;
  perPage?: number;
};

export function buildWhere(filters: VehicleFilters) {
  const where: Record<string, unknown> = { published: true };

  if (filters.brand) where.brand = filters.brand;
  if (filters.model) where.model = { contains: filters.model };
  if (filters.bodyType) where.bodyType = filters.bodyType;
  if (filters.fuel) where.fuel = filters.fuel;
  if (filters.transmission) where.transmission = filters.transmission;
  if (filters.condition) where.condition = filters.condition;
  if (filters.segment) where.segment = filters.segment;
  if (filters.rentalOnly) where.rentalAvailable = true;
  if (filters.availableOnly) where.status = "AVAILABLE";

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.price = {
      ...(filters.priceMin !== undefined ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { lte: filters.priceMax } : {}),
    };
  }
  if (filters.yearMin !== undefined || filters.yearMax !== undefined) {
    where.year = {
      ...(filters.yearMin !== undefined ? { gte: filters.yearMin } : {}),
      ...(filters.yearMax !== undefined ? { lte: filters.yearMax } : {}),
    };
  }
  if (filters.mileageMax !== undefined) where.mileage = { lte: filters.mileageMax };
  if (filters.powerMin !== undefined) where.powerHp = { gte: filters.powerMin };

  if (filters.q) {
    where.OR = [
      { brand: { contains: filters.q } },
      { model: { contains: filters.q } },
      { version: { contains: filters.q } },
      { reference: { contains: filters.q } },
    ];
  }

  return where;
}

function buildOrderBy(sort: string | undefined) {
  switch (sort) {
    case "price_asc": return [{ price: "asc" as const }];
    case "price_desc": return [{ price: "desc" as const }];
    case "mileage_asc": return [{ mileage: "asc" as const }];
    case "power_desc": return [{ powerHp: "desc" as const }];
    default: return [{ featured: "desc" as const }, { createdAt: "desc" as const }];
  }
}

/** Sold vehicles always sink to the bottom of a public list. */
function sinkSold(items: VehicleListItem[]): VehicleListItem[] {
  const rank = (s: string) => (s === "SOLD" ? 2 : s === "RESERVED" ? 1 : 0);
  return [...items].sort((a, b) => rank(a.status) - rank(b.status));
}

export async function listVehicles(filters: VehicleFilters, locale: Locale) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? 12;
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      select: LIST_SELECT,
      orderBy: buildOrderBy(filters.sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return {
    items: sinkSold(rows.map((row) => toListItem(row as unknown as RawListRow, locale))),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** How many cards the home page shows under the showcase car. */
export const HOME_GRID_SIZE = 6;
/** The showcase car at the top of the home page. */
export const HERO_RANK = 0;

/**
 * The home page, as arranged in the back office.
 *
 * `homeRank` is a hand-picked order: 0 is the showcase car, 1-6 are the cards
 * below it. Nothing guarantees the six slots are filled — a chosen car can be
 * sold, unpublished or deleted long after someone arranged the page — so the
 * remainder is topped up with the newest listings. The home page is never
 * short of cars because of a gap in the ordering.
 */
export async function getHomeShowcase(locale: Locale) {
  const [picked, pool] = await Promise.all([
    prisma.vehicle.findMany({
      where: { published: true, status: { not: "SOLD" }, homeRank: { not: null } },
      select: { ...LIST_SELECT, homeRank: true },
      orderBy: { homeRank: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { published: true, status: { not: "SOLD" } },
      select: LIST_SELECT,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: HOME_GRID_SIZE * 2 + 2,
    }),
  ]);

  const chosen = picked.map((row) => ({
    rank: row.homeRank as number,
    item: toListItem(row as unknown as RawListRow, locale),
  }));
  const fallback = pool.map((row) => toListItem(row as unknown as RawListRow, locale));

  const hero =
    chosen.find((entry) => entry.rank === HERO_RANK)?.item ?? fallback[0] ?? null;

  const grid = chosen
    .filter((entry) => entry.rank > HERO_RANK)
    .map((entry) => entry.item);

  // Top up, skipping anything already on the page — including the showcase
  // car, which would otherwise come back as the first card under itself.
  const taken = new Set(grid.map((v) => v.id));
  if (hero) taken.add(hero.id);
  for (const candidate of fallback) {
    if (grid.length >= HOME_GRID_SIZE) break;
    if (taken.has(candidate.id)) continue;
    taken.add(candidate.id);
    grid.push(candidate);
  }

  return { hero, grid: grid.slice(0, HOME_GRID_SIZE) };
}

/**
 * How the long-term rental offers may be ordered.
 *
 * Its own small list rather than the catalogue's `sort`: this page offers one
 * thing, a monthly payment, so its default is the cheapest monthly first and
 * the alternatives are the four a renter actually asks for. `nulls: "last"`
 * on the registration date matters — a car with no date recorded would
 * otherwise head the list of the newest ones.
 */
export const RENTAL_SORTS = ["price", "mileage", "registration", "listed"] as const;
export type RentalSort = (typeof RENTAL_SORTS)[number];

function rentalOrderBy(sort: string | undefined): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case "price": return [{ price: "asc" }];
    case "mileage": return [{ mileage: "asc" }];
    case "registration": return [{ firstRegistration: { sort: "desc", nulls: "last" } }];
    case "listed": return [{ createdAt: "desc" }];
    default: return [{ rentalMonthly: "asc" }];
  }
}

export async function getRentalVehicles(locale: Locale, take = 12, sort?: string) {
  const rows = await prisma.vehicle.findMany({
    where: { published: true, rentalAvailable: true, status: { not: "SOLD" } },
    select: LIST_SELECT,
    orderBy: rentalOrderBy(sort),
    take,
  });
  return rows.map((row) => toListItem(row as unknown as RawListRow, locale));
}

/**
 * The cars a quote can be built for: those actually offered on one formula or
 * the other. A car marked for neither is sold outright, and listing it here
 * would let a visitor configure a lease nobody is willing to sign.
 *
 * The finance overrides travel with them so the simulator quotes a car on its
 * own terms when it has any.
 */
export async function getQuotableVehicles(locale: Locale) {
  const rows = await prisma.vehicle.findMany({
    where: {
      published: true,
      status: { not: "SOLD" },
      OR: [{ rentalAvailable: true }, { loaAvailable: true }],
    },
    select: {
      id: true, brand: true, model: true, version: true, year: true, price: true,
      rentalAvailable: true, loaAvailable: true,
      financeRate: true, residualRate: true, servicesMonthly: true,
    },
    orderBy: [{ price: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    label: [row.brand, row.model, row.version].filter(Boolean).join(" ") + ` · ${row.year}`,
    price: row.price,
    lldAvailable: row.rentalAvailable,
    loaAvailable: row.loaAvailable,
    financeRate: row.financeRate,
    residualRate: row.residualRate,
    servicesMonthly: row.servicesMonthly,
  }));
}

export async function getSimilarVehicles(
  vehicle: { id: string; brand: string; bodyType: string; price: number },
  locale: Locale,
  take = 3,
) {
  const rows = await prisma.vehicle.findMany({
    where: {
      published: true,
      id: { not: vehicle.id },
      OR: [{ brand: vehicle.brand }, { bodyType: vehicle.bodyType }],
    },
    select: LIST_SELECT,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map((row) => toListItem(row as unknown as RawListRow, locale));
}

export async function getVehicleBySlug(slug: string) {
  return prisma.vehicle.findUnique({
    where: { slug },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { position: "asc" }] },
      translations: true,
      owner: { select: { id: true, name: true, jobTitle: true, phone: true, email: true, avatarUrl: true } },
    },
  });
}

export async function getVehicleById(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { position: "asc" }] },
      translations: true,
    },
  });
}

/** Distinct makes present in the published catalogue, for the filter bar. */
export async function getAvailableBrands(): Promise<string[]> {
  const rows = await prisma.vehicle.findMany({
    where: { published: true },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand);
}

export async function getPriceBounds(): Promise<{ min: number; max: number }> {
  const agg = await prisma.vehicle.aggregate({
    where: { published: true },
    _min: { price: true },
    _max: { price: true },
  });
  return { min: agg._min.price ?? 0, max: agg._max.price ?? 200000 };
}

export function vehicleTitle(v: { brand: string; model: string; version?: string | null }): string {
  return [v.brand, v.model, v.version].filter(Boolean).join(" ");
}

export function vehicleEquipment(v: { equipment: string }): string[] {
  return parseJsonArray<string>(v.equipment);
}

export function vehicleTranslation(
  translations: { locale: string; headline: string | null; description: string | null }[],
  locale: Locale,
) {
  return (
    translations.find((t) => t.locale === locale && (t.headline || t.description)) ??
    translations.find((t) => t.locale === "en" && (t.headline || t.description)) ??
    translations.find((t) => t.headline || t.description) ??
    null
  );
}
