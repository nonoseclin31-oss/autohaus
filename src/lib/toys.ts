import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { isAccessory, isWaterToy, type Locale } from "./taxonomy";
import { parseJsonArray } from "./utils";

/**
 * Big Toys — the read side.
 *
 * Deliberately a twin of lib/vehicles.ts rather than a shared abstraction:
 * the two catalogues describe different objects and will drift apart as each
 * grows. Sharing them now would buy a hundred saved lines and pay for it with
 * a conditional in every query.
 */

export type ToyListItem = {
  id: string;
  slug: string;
  reference: string;
  kind: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  condition: string;
  category: string | null;
  engineType: string;
  displacement: number | null;
  powerHp: number;
  topSpeed: number | null;
  /** km — land toys only. */
  mileage: number | null;
  /** engine hours — water toys only. */
  engineHours: number | null;
  seats: number | null;
  lengthM: number | null;
  price: number;
  oldPrice: number | null;
  vatDeductible: boolean;
  status: string;
  featured: boolean;
  trailerIncluded: boolean;
  coverUrl: string | null;
  imageCount: number;
  headline: string | null;
};

const LIST_SELECT = {
  id: true, slug: true, reference: true, kind: true, brand: true, model: true,
  version: true, year: true, condition: true, category: true, engineType: true,
  displacement: true, powerHp: true, topSpeed: true, mileage: true, engineHours: true,
  seats: true, lengthM: true, price: true, oldPrice: true, vatDeductible: true,
  status: true, featured: true, trailerIncluded: true,
  images: { orderBy: [{ isCover: "desc" }, { position: "asc" }], select: { url: true } },
  translations: { select: { locale: true, headline: true } },
} satisfies Prisma.ToySelect;

type RawListRow = {
  images: { url: string }[];
  translations: { locale: string; headline: string | null }[];
} & Omit<ToyListItem, "coverUrl" | "imageCount" | "headline">;

function toListItem(row: RawListRow, locale: Locale): ToyListItem {
  const { images, translations, ...rest } = row;
  const tr =
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === "en");
  return {
    ...rest,
    coverUrl: images[0]?.url ?? null,
    imageCount: images.length,
    headline: tr?.headline ?? null,
  };
}

export type ToyFilters = {
  kind?: string;
  brand?: string;
  category?: string;
  condition?: string;
  engineType?: string;
  priceMin?: number;
  priceMax?: number;
  powerMin?: number;
  availableOnly?: boolean;
  /** The showcase piece, so the collection below it never repeats it. */
  excludeId?: string;
  q?: string;
  sort?: string;
  page?: number;
  perPage?: number;
};

export function buildToyWhere(filters: ToyFilters) {
  const where: Record<string, unknown> = { published: true };

  if (filters.kind) where.kind = filters.kind;
  if (filters.brand) where.brand = filters.brand;
  if (filters.category) where.category = filters.category;
  if (filters.condition) where.condition = filters.condition;
  if (filters.engineType) where.engineType = filters.engineType;
  if (filters.availableOnly) where.status = "AVAILABLE";
  if (filters.excludeId) where.id = { not: filters.excludeId };

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.price = {
      ...(filters.priceMin !== undefined ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { lte: filters.priceMax } : {}),
    };
  }
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
    case "power_desc": return [{ powerHp: "desc" as const }];
    case "year_desc": return [{ year: "desc" as const }];
    // The back office's hand-picked order comes first; everything it did not
    // place falls in behind it, newest first. `nulls: "last"` is what keeps an
    // unranked piece from sorting above a chosen one.
    default: return [
      { homeRank: { sort: "asc" as const, nulls: "last" as const } },
      { featured: "desc" as const },
      { createdAt: "desc" as const },
    ];
  }
}

/** Sold pieces always sink to the bottom of a public list. */
function sinkSold(items: ToyListItem[]): ToyListItem[] {
  const rank = (s: string) => (s === "SOLD" ? 2 : s === "RESERVED" ? 1 : 0);
  return [...items].sort((a, b) => rank(a.status) - rank(b.status));
}

export async function listToys(filters: ToyFilters, locale: Locale) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? 12;
  const where = buildToyWhere(filters);

  const [rows, total] = await Promise.all([
    prisma.toy.findMany({
      where,
      select: LIST_SELECT,
      orderBy: buildOrderBy(filters.sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.toy.count({ where }),
  ]);

  return {
    items: sinkSold(rows.map((row) => toListItem(row as unknown as RawListRow, locale))),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** How many cards the back office arranges by hand under the showcase. */
export const TOYS_GRID_SIZE = 6;
/** The showcase piece at the top of the Big Toys page. */
export const TOY_HERO_RANK = 0;

/**
 * The piece at the top of the Big Toys page.
 *
 * Unlike the car home page there is no separate grid to fill: Big Toys is one
 * page, so the arrangement made in the back office is simply the order the
 * collection is listed in (see buildOrderBy). Only the showcase piece is
 * lifted out, and the caller passes its id back as `excludeId` so it is not
 * printed a second time as the first card of its own collection.
 *
 * Nothing guarantees the pick is still there — it can be sold or unpublished
 * long after someone chose it — so an empty rank falls back to the newest.
 */
export async function getToyHero(locale: Locale): Promise<ToyListItem | null> {
  const row =
    (await prisma.toy.findFirst({
      where: { published: true, status: { not: "SOLD" }, homeRank: TOY_HERO_RANK },
      select: LIST_SELECT,
    })) ??
    (await prisma.toy.findFirst({
      where: { published: true, status: { not: "SOLD" } },
      select: LIST_SELECT,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }));

  return row ? toListItem(row as unknown as RawListRow, locale) : null;
}

/** How many published pieces there are in each of the four families. */
export async function getToyKindCounts(): Promise<Record<string, number>> {
  const rows = await prisma.toy.groupBy({
    by: ["kind"],
    where: { published: true },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const row of rows) out[row.kind] = row._count._all;
  return out;
}

export async function getSimilarToys(
  toy: { id: string; kind: string; brand: string },
  locale: Locale,
  take = 3,
) {
  const rows = await prisma.toy.findMany({
    where: {
      published: true,
      id: { not: toy.id },
      OR: [{ kind: toy.kind }, { brand: toy.brand }],
    },
    select: LIST_SELECT,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map((row) => toListItem(row as unknown as RawListRow, locale));
}

export async function getToyBySlug(slug: string) {
  const row = await prisma.toy.findUnique({
    where: { slug },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { position: "asc" }] },
      translations: true,
      owner: { select: { id: true, name: true, jobTitle: true, phone: true, email: true, avatarUrl: true, active: true } },
    },
  });
  if (!row) return null;
  // An advisor whose account has been switched off has left, or is away:
  // their name, number and address come off every public page at once, and
  // the page falls back to the showroom's own contact details.
  const { owner, ...rest } = row;
  return {
    ...rest,
    owner: owner?.active ? { id: owner.id, name: owner.name, jobTitle: owner.jobTitle, phone: owner.phone, email: owner.email, avatarUrl: owner.avatarUrl } : null,
  };
}

export async function getToyById(id: string) {
  return prisma.toy.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { position: "asc" }] },
      translations: true,
    },
  });
}

/** Distinct makes present in the published Big Toys catalogue. */
export async function getToyBrands(): Promise<string[]> {
  const rows = await prisma.toy.findMany({
    where: { published: true },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand);
}

export function toyTitle(t: { brand: string; model: string; version?: string | null }): string {
  return [t.brand, t.model, t.version].filter(Boolean).join(" ");
}

export function toyEquipment(t: { equipment: string }): string[] {
  return parseJsonArray<string>(t.equipment);
}

export function toyTranslation(
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

/**
 * The one figure that says how used a piece is: kilometres for something with
 * wheels, engine hours for something with a hull. Returning the unit with the
 * number keeps every caller from having to re-derive which world it is in.
 */
export function toyUsage(
  toy: { kind: string; mileage: number | null; engineHours: number | null },
): { value: number; unit: "km" | "h" } | null {
  // A helmet has neither. Returning "0 km" for one would be a fact nobody
  // meant to state.
  if (isAccessory(toy.kind)) return null;
  if (isWaterToy(toy.kind)) {
    return toy.engineHours === null ? null : { value: toy.engineHours, unit: "h" };
  }
  return toy.mileage === null ? null : { value: toy.mileage, unit: "km" };
}
