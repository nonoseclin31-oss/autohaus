"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { can, canEditToy, canDeleteToy } from "@/lib/rbac";
import { LOCALES, isAccessory } from "@/lib/taxonomy";
import { slugify, generateReference, toInt, toFloat, toStr, toBool, toDate, parseJsonArray } from "@/lib/utils";
import { resolveLocale } from "@/i18n";
import { TOY_HERO_RANK, TOYS_GRID_SIZE } from "@/lib/toys";
import { toyPayloadFromForm } from "@/lib/toy-templates";

export type ToyFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Set when the submission saved a template rather than the listing. */
  templateSaved?: string;
};

type ImagePayload = { url: string; alt?: string | null };

const STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "COMING_SOON"];
const KINDS = ["MOTORCYCLE", "QUAD", "BUGGY", "JETSKI", "BOAT", "ACCESSORY"];

/** Every public path a change to one listing can show up on. */
function revalidateToy(locale: string, slug?: string | null) {
  revalidatePath(`/${locale}/admin/toys`);
  revalidatePath(`/${locale}/big-toys`);
  if (slug) revalidatePath(`/${locale}/big-toys/${slug}`);
}

/** Create or update a Big Toy from the admin form. */
export async function saveToy(
  _prev: ToyFormState,
  formData: FormData,
): Promise<ToyFormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "unauthenticated" };

  const id = toStr(formData.get("id"));
  const locale = resolveLocale(toStr(formData.get("locale")));
  const isUpdate = !!id;

  // ── Permission ───────────────────────────────────────────
  if (isUpdate) {
    const existing = await prisma.toy.findUnique({ where: { id: id! }, select: { ownerId: true } });
    if (!existing) return { status: "error", message: "notfound" };
    if (!canEditToy(user, existing)) return { status: "error", message: "forbidden" };
  } else if (!can(user.role, "vehicle.create")) {
    return { status: "error", message: "forbidden" };
  }

  const brand = toStr(formData.get("brand"));
  const model = toStr(formData.get("model"));

  let kind = toStr(formData.get("kind")) ?? "MOTORCYCLE";
  if (!KINDS.includes(kind)) kind = "MOTORCYCLE";

  // ── Save as a template ───────────────────────────────────
  // Handled before anything is written, so saving a template from an open
  // listing never touches the listing itself.
  if (toStr(formData.get("intent")) === "template") {
    if (!can(user.role, "vehicle.create")) return { status: "error", message: "forbidden" };

    const templateName = toStr(formData.get("templateName"));
    if (!templateName) return { status: "error", message: "template-name" };
    if (!brand || !model) {
      return {
        status: "error",
        message: "validation",
        fieldErrors: { ...(!brand && { brand: "required" }), ...(!model && { model: "required" }) },
      };
    }

    try {
      const template = await prisma.toyTemplate.create({
        data: {
          name: templateName.slice(0, 80),
          kind,
          brand,
          model,
          version: toStr(formData.get("version")),
          payload: toyPayloadFromForm(formData),
          createdById: user.id,
        },
      });
      await logActivity(user.id, "toyTemplate.created", "ToyTemplate", template.id, `${templateName} — ${brand} ${model}`);
    } catch {
      return { status: "error", message: "server" };
    }

    revalidatePath(`/${locale}/admin/toys/new`);
    return { status: "success", templateSaved: templateName };
  }

  const year = toInt(formData.get("year"));
  const price = toInt(formData.get("price"));
  const powerHp = toInt(formData.get("powerHp"));

  // A draft is something someone started and will come back to. It never
  // reaches the public site, so it only needs to be recognisable in the list.
  const asDraft = toStr(formData.get("intent")) === "draft";

  const fieldErrors: Record<string, string> = {};
  if (!brand) fieldErrors.brand = "required";
  if (!model) fieldErrors.model = "required";
  if (!asDraft) {
    if (!year || year < 1950 || year > new Date().getFullYear() + 2) fieldErrors.year = "required";
    if (price === null || price < 0) fieldErrors.price = "required";
    // An accessory has no engine, so it cannot be asked for its power. The
    // column is not nullable, so it stores a zero the listing never shows.
    if (!isAccessory(kind) && (powerHp === null || powerHp < 0)) fieldErrors.powerHp = "required";
  }
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "validation", fieldErrors };
  }

  // ── Reference & slug ─────────────────────────────────────
  let reference = toStr(formData.get("reference")) ?? generateReference();
  let slug = toStr(formData.get("slug"));
  if (slug) slug = slugify(slug);
  if (!slug) slug = slugify(`${brand}-${model}-${toStr(formData.get("version")) ?? ""}-${reference}`);

  const clash = await prisma.toy.findFirst({
    where: { OR: [{ slug }, { reference }], ...(id ? { NOT: { id } } : {}) },
    select: { id: true, slug: true, reference: true },
  });
  if (clash) {
    if (clash.slug === slug) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    if (clash.reference === reference) reference = generateReference();
  }

  let status = toStr(formData.get("status")) ?? "AVAILABLE";
  if (!STATUSES.includes(status)) status = "AVAILABLE";
  if (!can(user.role, "vehicle.status")) status = "AVAILABLE";

  const published =
    !asDraft && can(user.role, "vehicle.publish") ? toBool(formData.get("published")) : false;

  const equipment = formData.getAll("equipment").map(String).filter(Boolean);

  const data = {
    slug,
    reference,
    kind,
    brand: brand!,
    model: model!,
    version: toStr(formData.get("version")),
    year: year ?? new Date().getFullYear(),
    hullId: toStr(formData.get("hullId")),

    condition: toStr(formData.get("condition")) ?? "USED",
    category: toStr(formData.get("category")),

    engineType: toStr(formData.get("engineType")) ?? "PETROL",
    displacement: toInt(formData.get("displacement")),
    cylinders: toInt(formData.get("cylinders")),
    strokes: toInt(formData.get("strokes")),
    powerHp: powerHp ?? 0,
    powerKw: toInt(formData.get("powerKw")) ?? (powerHp ? Math.round(powerHp * 0.7355) : null),
    torqueNm: toInt(formData.get("torqueNm")),
    topSpeed: toInt(formData.get("topSpeed")),
    transmission: toStr(formData.get("transmission")),
    engineCount: toInt(formData.get("engineCount")) ?? 1,

    mileage: toInt(formData.get("mileage")),
    engineHours: toInt(formData.get("engineHours")),
    dryWeight: toInt(formData.get("dryWeight")),
    seats: toInt(formData.get("seats")),
    lengthM: toFloat(formData.get("lengthM")),
    beamM: toFloat(formData.get("beamM")),
    fuelCapacity: toFloat(formData.get("fuelCapacity")),
    rangeKm: toInt(formData.get("rangeKm")),

    trailerIncluded: toBool(formData.get("trailerIncluded")),
    registered: toBool(formData.get("registered")),
    licence: toStr(formData.get("licence")),
    warrantyMonths: toInt(formData.get("warrantyMonths")),
    serviceHistory: toBool(formData.get("serviceHistory")),
    accidentFree: toBool(formData.get("accidentFree")),
    previousOwners: toInt(formData.get("previousOwners")),
    firstRegistration: toDate(formData.get("firstRegistration")),

    colorExterior: toStr(formData.get("colorExterior")),

    price: price ?? 0,
    priceNet: toInt(formData.get("priceNet")),
    vatDeductible: toBool(formData.get("vatDeductible")),
    oldPrice: toInt(formData.get("oldPrice")),
    negotiable: toBool(formData.get("negotiable")),
    financingMonthly: toInt(formData.get("financingMonthly")),

    equipment: JSON.stringify(equipment),
    videoUrl: toStr(formData.get("videoUrl")),

    status,
    published,
    featured: toBool(formData.get("featured")),
    location: toStr(formData.get("location")),
    soldAt: status === "SOLD" ? new Date() : null,
  };

  // Only ADMIN/MANAGER may reassign an advisor; SALES owns what they create.
  const ownerInput = toStr(formData.get("ownerId"));
  const ownerId = can(user.role, "vehicle.update.any") ? ownerInput : isUpdate ? undefined : user.id;

  const images = parseJsonArray<ImagePayload>(toStr(formData.get("images")));

  try {
    let toyId: string;

    if (isUpdate) {
      await prisma.toy.update({
        where: { id: id! },
        data: { ...data, ...(ownerId !== undefined ? { ownerId } : {}) },
      });
      toyId = id!;
      await prisma.toyImage.deleteMany({ where: { toyId } });
    } else {
      const created = await prisma.toy.create({ data: { ...data, ownerId: ownerId ?? user.id } });
      toyId = created.id;
    }

    if (images.length) {
      await prisma.toyImage.createMany({
        data: images.map((image, index) => ({
          toyId,
          url: image.url,
          alt: image.alt ?? `${brand} ${model}`,
          position: index,
          isCover: index === 0,
        })),
      });
    }

    for (const code of LOCALES) {
      const headline = toStr(formData.get(`headline_${code}`));
      const description = toStr(formData.get(`description_${code}`));

      if (headline || description) {
        await prisma.toyTranslation.upsert({
          where: { toyId_locale: { toyId, locale: code } },
          create: { toyId, locale: code, headline, description },
          update: { headline, description },
        });
      } else {
        await prisma.toyTranslation
          .delete({ where: { toyId_locale: { toyId, locale: code } } })
          .catch(() => {});
      }
    }

    await logActivity(
      user.id,
      isUpdate ? "toy.updated" : "toy.created",
      "Toy",
      toyId,
      `${brand} ${model} (${reference})`,
    );

    revalidateToy(locale, slug);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "server" };
  }

  redirect(`/${locale}/admin/toys`);
}

export async function setToyStatus(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "vehicle.status")) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id || !STATUSES.includes(status)) return;

  const toy = await prisma.toy.findUnique({
    where: { id },
    select: { ownerId: true, slug: true, brand: true, model: true },
  });
  if (!toy || !canEditToy(user, toy)) return;

  await prisma.toy.update({
    where: { id },
    data: { status, soldAt: status === "SOLD" ? new Date() : null },
  });
  await logActivity(user.id, `toy.status.${status.toLowerCase()}`, "Toy", id, `${toy.brand} ${toy.model}`);
  revalidateToy(locale, toy.slug);
}

export async function toggleToyPublished(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "vehicle.publish")) return;

  const id = String(formData.get("id") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id) return;

  const toy = await prisma.toy.findUnique({
    where: { id },
    select: { published: true, ownerId: true, slug: true },
  });
  if (!toy || !canEditToy(user, toy)) return;

  await prisma.toy.update({ where: { id }, data: { published: !toy.published } });
  await logActivity(user.id, toy.published ? "toy.unpublished" : "toy.published", "Toy", id);
  revalidateToy(locale, toy.slug);
}

export async function toggleToyFeatured(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "vehicle.update.own")) return;

  const id = String(formData.get("id") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id) return;

  const toy = await prisma.toy.findUnique({ where: { id }, select: { featured: true, ownerId: true } });
  if (!toy || !canEditToy(user, toy)) return;

  await prisma.toy.update({ where: { id }, data: { featured: !toy.featured } });
  revalidateToy(locale);
}

export async function deleteToy(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canDeleteToy(user)) return;

  const id = String(formData.get("id") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id) return;

  const toy = await prisma.toy.findUnique({
    where: { id },
    select: { brand: true, model: true, reference: true },
  });

  await prisma.toy.delete({ where: { id } });
  await logActivity(
    user.id, "toy.deleted", "Toy", id,
    toy ? `${toy.brand} ${toy.model} (${toy.reference})` : undefined,
  );

  revalidateToy(locale);
  redirect(`/${locale}/admin/toys`);
}

/* ──────────────── Big Toys landing arrangement ──────────────── */

export type ToyShowcaseState = { status: "idle" | "saved" | "error"; message?: string };

/**
 * Arrange the Big Toys page: the showcase piece at the top and the cards
 * under it, in order. Rewritten in one go like the home page — the ranks are
 * a single arrangement, so a stale slot cannot survive a save.
 */
export async function saveToyShowcase(
  _prev: ToyShowcaseState,
  formData: FormData,
): Promise<ToyShowcaseState> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "vehicle.update.any")) {
    return { status: "error", message: "denied" };
  }

  const locale = resolveLocale(String(formData.get("locale") ?? ""));

  const eligible = new Set(
    (
      await prisma.toy.findMany({
        where: { published: true, status: { not: "SOLD" } },
        select: { id: true },
      })
    ).map((row) => row.id),
  );

  const heroId = String(formData.get("hero") ?? "");
  const hero = heroId && eligible.has(heroId) ? heroId : null;

  const order: string[] = [];
  for (const raw of formData.getAll("slot")) {
    const id = String(raw);
    if (!id || id === hero || !eligible.has(id) || order.includes(id)) continue;
    order.push(id);
    if (order.length >= TOYS_GRID_SIZE) break;
  }

  const ranks = new Map<string, number>();
  if (hero) ranks.set(hero, TOY_HERO_RANK);
  order.forEach((id, index) => ranks.set(id, index + 1));

  await prisma.$transaction([
    prisma.toy.updateMany({ where: { homeRank: { not: null } }, data: { homeRank: null } }),
    ...[...ranks].map(([id, rank]) => prisma.toy.update({ where: { id }, data: { homeRank: rank } })),
  ]);

  await logActivity(
    user.id, "update", "big-toys", null,
    `${ranks.size} ${ranks.size === 1 ? "listing" : "listings"} placed on the Big Toys page`,
  );

  revalidatePath(`/${locale}/admin/toys/showcase`);
  revalidatePath(`/${locale}/big-toys`);
  return { status: "saved" };
}

/** Remove a saved Big Toy template. Its author may delete it; so may a manager. */
export async function deleteToyTemplate(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const id = toStr(formData.get("id"));
  const locale = resolveLocale(toStr(formData.get("locale")));
  if (!id) return;

  const template = await prisma.toyTemplate.findUnique({
    where: { id },
    select: { name: true, createdById: true },
  });
  if (!template) return;

  const mine = template.createdById === user.id;
  if (!mine && !can(user.role, "vehicle.update.any")) return;

  await prisma.toyTemplate.delete({ where: { id } });
  await logActivity(user.id, "toyTemplate.deleted", "ToyTemplate", id, template.name);
  revalidatePath(`/${locale}/admin/toys/new`);
}
