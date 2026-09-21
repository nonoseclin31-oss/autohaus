"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { can, canEditVehicle, canDeleteVehicle } from "@/lib/rbac";
import { LOCALES } from "@/lib/taxonomy";
import {
  slugify, generateReference, toInt, toFloat, toStr, toBool, toDate, parseJsonArray,
} from "@/lib/utils";
import { resolveLocale } from "@/i18n";

export type VehicleFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

type ImagePayload = { url: string; alt?: string | null; isCover?: boolean };

const STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "COMING_SOON"];

/** Create or update a vehicle from the admin form. */
export async function saveVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "unauthenticated" };

  const id = toStr(formData.get("id"));
  const locale = resolveLocale(toStr(formData.get("locale")));
  const isUpdate = !!id;

  // ── Permission ───────────────────────────────────────────
  if (isUpdate) {
    const existing = await prisma.vehicle.findUnique({ where: { id: id! }, select: { ownerId: true } });
    if (!existing) return { status: "error", message: "notfound" };
    if (!canEditVehicle(user, existing)) return { status: "error", message: "forbidden" };
  } else if (!can(user.role, "vehicle.create")) {
    return { status: "error", message: "forbidden" };
  }

  // ── Required fields ──────────────────────────────────────
  const brand = toStr(formData.get("brand"));
  const model = toStr(formData.get("model"));
  const year = toInt(formData.get("year"));
  const price = toInt(formData.get("price"));
  const powerHp = toInt(formData.get("powerHp"));

  const fieldErrors: Record<string, string> = {};
  if (!brand) fieldErrors.brand = "required";
  if (!model) fieldErrors.model = "required";
  if (!year || year < 1950 || year > new Date().getFullYear() + 2) fieldErrors.year = "required";
  if (price === null || price < 0) fieldErrors.price = "required";
  if (powerHp === null || powerHp < 0) fieldErrors.powerHp = "required";
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "validation", fieldErrors };
  }

  // ── Reference & slug ─────────────────────────────────────
  let reference = toStr(formData.get("reference"));
  if (!reference) reference = generateReference();

  let slug = toStr(formData.get("slug"));
  if (slug) slug = slugify(slug);
  if (!slug) slug = slugify(`${brand}-${model}-${toStr(formData.get("version")) ?? ""}-${reference}`);

  // Guarantee uniqueness of slug and reference.
  const clash = await prisma.vehicle.findFirst({
    where: { OR: [{ slug }, { reference }], ...(id ? { NOT: { id } } : {}) },
    select: { id: true, slug: true, reference: true },
  });
  if (clash) {
    if (clash.slug === slug) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    if (clash.reference === reference) reference = generateReference();
  }

  // ── Status ───────────────────────────────────────────────
  let status = toStr(formData.get("status")) ?? "AVAILABLE";
  if (!STATUSES.includes(status)) status = "AVAILABLE";
  if (!can(user.role, "vehicle.status")) status = "AVAILABLE";

  const published = can(user.role, "vehicle.publish") ? toBool(formData.get("published")) : false;

  // ── Equipment ────────────────────────────────────────────
  const equipment = formData.getAll("equipment").map(String).filter(Boolean);

  // ── Rental option lists ──────────────────────────────────
  const rentalDurations = formData.getAll("rentalDurations").map((v) => Number(v)).filter(Number.isFinite);
  const rentalMileages = formData.getAll("rentalMileages").map((v) => Number(v)).filter(Number.isFinite);

  const data = {
    slug,
    reference,
    brand: brand!,
    model: model!,
    version: toStr(formData.get("version")),
    year: year!,
    vin: toStr(formData.get("vin")),

    bodyType: toStr(formData.get("bodyType")) ?? "SEDAN",
    condition: toStr(formData.get("condition")) ?? "USED",
    segment: toStr(formData.get("segment")),

    fuel: toStr(formData.get("fuel")) ?? "PETROL",
    transmission: toStr(formData.get("transmission")) ?? "MANUAL",
    gears: toInt(formData.get("gears")),
    drivetrain: toStr(formData.get("drivetrain")),
    engineSize: toFloat(formData.get("engineSize")),
    cylinders: toInt(formData.get("cylinders")),
    powerHp: powerHp!,
    powerKw: toInt(formData.get("powerKw")) ?? Math.round(powerHp! * 0.7355),
    torqueNm: toInt(formData.get("torqueNm")),
    acceleration: toFloat(formData.get("acceleration")),
    topSpeed: toInt(formData.get("topSpeed")),

    consumptionCombined: toFloat(formData.get("consumptionCombined")),
    consumptionUrban: toFloat(formData.get("consumptionUrban")),
    consumptionHighway: toFloat(formData.get("consumptionHighway")),
    co2: toInt(formData.get("co2")),
    emissionClass: toStr(formData.get("emissionClass")),
    energyLabel: toStr(formData.get("energyLabel")),
    batteryCapacity: toFloat(formData.get("batteryCapacity")),
    electricRange: toInt(formData.get("electricRange")),
    chargingTime: toStr(formData.get("chargingTime")),

    doors: toInt(formData.get("doors")),
    seats: toInt(formData.get("seats")),
    colorExterior: toStr(formData.get("colorExterior")),
    colorInterior: toStr(formData.get("colorInterior")),
    paintType: toStr(formData.get("paintType")),
    upholstery: toStr(formData.get("upholstery")),

    mileage: toInt(formData.get("mileage")) ?? 0,
    firstRegistration: toDate(formData.get("firstRegistration")),
    previousOwners: toInt(formData.get("previousOwners")),
    serviceHistory: toBool(formData.get("serviceHistory")),
    warrantyMonths: toInt(formData.get("warrantyMonths")),
    nextInspection: toDate(formData.get("nextInspection")),
    accidentFree: toBool(formData.get("accidentFree")),
    nonSmoker: toBool(formData.get("nonSmoker")),
    imported: toBool(formData.get("imported")),

    price: price!,
    priceNet: toInt(formData.get("priceNet")),
    vatDeductible: toBool(formData.get("vatDeductible")),
    oldPrice: toInt(formData.get("oldPrice")),
    negotiable: toBool(formData.get("negotiable")),
    financingMonthly: toInt(formData.get("financingMonthly")),

    rentalAvailable: toBool(formData.get("rentalAvailable")),
    rentalMonthly: toInt(formData.get("rentalMonthly")),
    rentalDeposit: toInt(formData.get("rentalDeposit")),
    rentalFirstPayment: toInt(formData.get("rentalFirstPayment")),
    rentalDurations: JSON.stringify(rentalDurations),
    rentalMileages: JSON.stringify(rentalMileages),

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

  // ── Images ───────────────────────────────────────────────
  const images = parseJsonArray<ImagePayload>(toStr(formData.get("images")));

  try {
    let vehicleId: string;

    if (isUpdate) {
      await prisma.vehicle.update({
        where: { id: id! },
        data: { ...data, ...(ownerId !== undefined ? { ownerId } : {}) },
      });
      vehicleId = id!;
      await prisma.vehicleImage.deleteMany({ where: { vehicleId } });
    } else {
      const created = await prisma.vehicle.create({
        data: { ...data, ownerId: ownerId ?? user.id },
      });
      vehicleId = created.id;
    }

    if (images.length) {
      await prisma.vehicleImage.createMany({
        data: images.map((image, index) => ({
          vehicleId,
          url: image.url,
          alt: image.alt ?? `${brand} ${model}`,
          position: index,
          isCover: index === 0,
        })),
      });
    }

    // ── Translations (one row per locale that has content) ──
    for (const code of LOCALES) {
      const headline = toStr(formData.get(`headline_${code}`));
      const description = toStr(formData.get(`description_${code}`));

      if (headline || description) {
        await prisma.vehicleTranslation.upsert({
          where: { vehicleId_locale: { vehicleId, locale: code } },
          create: { vehicleId, locale: code, headline, description },
          update: { headline, description },
        });
      } else {
        await prisma.vehicleTranslation
          .delete({ where: { vehicleId_locale: { vehicleId, locale: code } } })
          .catch(() => {});
      }
    }

    await logActivity(
      user.id,
      isUpdate ? "vehicle.updated" : "vehicle.created",
      "Vehicle",
      vehicleId,
      `${brand} ${model} (${reference})`,
    );

    revalidatePath(`/${locale}/admin/vehicles`);
    revalidatePath(`/${locale}/vehicles`);
    revalidatePath(`/${locale}/vehicles/${slug}`);
    revalidatePath(`/${locale}`);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "server",
    };
  }

  redirect(`/${locale}/admin/vehicles`);
}

/** Quick red-vignette action from the vehicle table. */
export async function setVehicleStatus(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "vehicle.status")) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id || !STATUSES.includes(status)) return;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: { ownerId: true, slug: true, brand: true, model: true },
  });
  if (!vehicle || !canEditVehicle(user, vehicle)) return;

  await prisma.vehicle.update({
    where: { id },
    data: { status, soldAt: status === "SOLD" ? new Date() : null },
  });

  await logActivity(user.id, `vehicle.status.${status.toLowerCase()}`, "Vehicle", id, `${vehicle.brand} ${vehicle.model}`);

  revalidatePath(`/${locale}/admin/vehicles`);
  revalidatePath(`/${locale}/vehicles`);
  revalidatePath(`/${locale}/vehicles/${vehicle.slug}`);
}

export async function togglePublished(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "vehicle.publish")) return;

  const id = String(formData.get("id") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id) return;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: { published: true, ownerId: true, slug: true },
  });
  if (!vehicle || !canEditVehicle(user, vehicle)) return;

  await prisma.vehicle.update({ where: { id }, data: { published: !vehicle.published } });
  await logActivity(user.id, vehicle.published ? "vehicle.unpublished" : "vehicle.published", "Vehicle", id);

  revalidatePath(`/${locale}/admin/vehicles`);
  revalidatePath(`/${locale}/vehicles`);
}

export async function toggleFeatured(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "vehicle.update.own")) return;

  const id = String(formData.get("id") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id) return;

  const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { featured: true, ownerId: true } });
  if (!vehicle || !canEditVehicle(user, vehicle)) return;

  await prisma.vehicle.update({ where: { id }, data: { featured: !vehicle.featured } });
  revalidatePath(`/${locale}/admin/vehicles`);
  revalidatePath(`/${locale}`);
}

export async function deleteVehicle(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canDeleteVehicle(user)) return;

  const id = String(formData.get("id") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id) return;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: { brand: true, model: true, reference: true },
  });

  await prisma.vehicle.delete({ where: { id } });
  await logActivity(
    user.id, "vehicle.deleted", "Vehicle", id,
    vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.reference})` : undefined,
  );

  revalidatePath(`/${locale}/admin/vehicles`);
  revalidatePath(`/${locale}/vehicles`);
  redirect(`/${locale}/admin/vehicles`);
}
