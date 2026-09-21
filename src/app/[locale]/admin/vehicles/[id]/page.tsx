import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can, canEditVehicle } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVehicleById } from "@/lib/vehicles";
import { VehicleForm, type VehicleFormValues } from "@/components/admin/vehicle-form";
import { IconArrowLeft, IconEye } from "@/components/icons";
import { parseJsonArray } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = resolveLocale(raw);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  // The layout redirects signed-out visitors, but a page renders in
  // parallel with its layout, so it has to guard for itself.
  if (!user) redirect(localePath(locale, "/login"));

  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();
  if (!canEditVehicle(user, vehicle)) redirect(localePath(locale, "/admin/vehicles"));

  const advisors = await prisma.user.findMany({
    where: { active: true, role: { in: ["ADMIN", "MANAGER", "SALES"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const translations: VehicleFormValues["translations"] = {};
  for (const tr of vehicle.translations) {
    translations[tr.locale] = { headline: tr.headline ?? "", description: tr.description ?? "" };
  }

  const values: VehicleFormValues = {
    id: vehicle.id,
    reference: vehicle.reference,
    slug: vehicle.slug,
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version,
    year: vehicle.year,
    vin: vehicle.vin,
    bodyType: vehicle.bodyType,
    condition: vehicle.condition,
    segment: vehicle.segment,
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    gears: vehicle.gears,
    drivetrain: vehicle.drivetrain,
    engineSize: vehicle.engineSize,
    cylinders: vehicle.cylinders,
    powerHp: vehicle.powerHp,
    powerKw: vehicle.powerKw,
    torqueNm: vehicle.torqueNm,
    acceleration: vehicle.acceleration,
    topSpeed: vehicle.topSpeed,
    consumptionCombined: vehicle.consumptionCombined,
    consumptionUrban: vehicle.consumptionUrban,
    consumptionHighway: vehicle.consumptionHighway,
    co2: vehicle.co2,
    emissionClass: vehicle.emissionClass,
    energyLabel: vehicle.energyLabel,
    batteryCapacity: vehicle.batteryCapacity,
    electricRange: vehicle.electricRange,
    chargingTime: vehicle.chargingTime,
    doors: vehicle.doors,
    seats: vehicle.seats,
    colorExterior: vehicle.colorExterior,
    colorInterior: vehicle.colorInterior,
    paintType: vehicle.paintType,
    upholstery: vehicle.upholstery,
    mileage: vehicle.mileage,
    firstRegistration: isoDate(vehicle.firstRegistration),
    previousOwners: vehicle.previousOwners,
    serviceHistory: vehicle.serviceHistory,
    warrantyMonths: vehicle.warrantyMonths,
    nextInspection: isoDate(vehicle.nextInspection),
    accidentFree: vehicle.accidentFree,
    nonSmoker: vehicle.nonSmoker,
    imported: vehicle.imported,
    price: vehicle.price,
    priceNet: vehicle.priceNet,
    vatDeductible: vehicle.vatDeductible,
    oldPrice: vehicle.oldPrice,
    negotiable: vehicle.negotiable,
    financingMonthly: vehicle.financingMonthly,
    rentalAvailable: vehicle.rentalAvailable,
    rentalMonthly: vehicle.rentalMonthly,
    rentalDeposit: vehicle.rentalDeposit,
    rentalFirstPayment: vehicle.rentalFirstPayment,
    rentalDurations: parseJsonArray<number>(vehicle.rentalDurations),
    rentalMileages: parseJsonArray<number>(vehicle.rentalMileages),
    equipment: parseJsonArray<string>(vehicle.equipment),
    videoUrl: vehicle.videoUrl,
    status: vehicle.status,
    published: vehicle.published,
    featured: vehicle.featured,
    location: vehicle.location,
    ownerId: vehicle.ownerId,
    images: vehicle.images.map((image) => ({ url: image.url, alt: image.alt })),
    translations,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={localePath(locale, "/admin/vehicles")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
          >
            <IconArrowLeft size={15} />
            {t.admin.vehicles}
          </Link>
          <h1 className="mt-2 display text-3xl">
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="mt-1 font-mono text-xs text-subtle">{vehicle.reference}</p>
        </div>

        {vehicle.published ? (
          <Link
            href={localePath(locale, `/vehicles/${vehicle.slug}`)}
            target="_blank"
            className="btn btn-ghost btn-sm cursor-pointer"
          >
            <IconEye size={15} />
            {t.cta.viewDetails}
          </Link>
        ) : null}
      </div>

      <VehicleForm
        locale={locale}
        values={values}
        advisors={advisors}
        permissions={{
          canPublish: can(user.role, "vehicle.publish"),
          canSetStatus: can(user.role, "vehicle.status"),
          canAssignOwner: can(user.role, "vehicle.update.any"),
        }}
      />
    </div>
  );
}
