import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can, canEditToy } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getToyById } from "@/lib/toys";
import { ToyForm, type ToyFormValues } from "@/components/admin/toy-form";
import { label, TOY_KINDS, type Locale as TaxLocale } from "@/lib/taxonomy";
import { IconArrowLeft, IconEye } from "@/components/icons";
import { parseJsonArray } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function EditToyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = resolveLocale(raw);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));

  const toy = await getToyById(id);
  if (!toy) notFound();
  if (!canEditToy(user, toy)) redirect(localePath(locale, "/admin/toys"));

  const advisors = await prisma.user.findMany({
    where: { active: true, role: { in: ["ADMIN", "MANAGER", "SALES"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const translations: ToyFormValues["translations"] = {};
  for (const tr of toy.translations) {
    translations[tr.locale] = { headline: tr.headline ?? "", description: tr.description ?? "" };
  }

  const values: ToyFormValues = {
    id: toy.id,
    reference: toy.reference,
    slug: toy.slug,
    kind: toy.kind,
    brand: toy.brand,
    model: toy.model,
    version: toy.version,
    year: toy.year,
    hullId: toy.hullId,
    condition: toy.condition,
    category: toy.category,
    engineType: toy.engineType,
    displacement: toy.displacement,
    cylinders: toy.cylinders,
    strokes: toy.strokes,
    powerHp: toy.powerHp,
    powerKw: toy.powerKw,
    torqueNm: toy.torqueNm,
    topSpeed: toy.topSpeed,
    transmission: toy.transmission,
    engineCount: toy.engineCount,
    mileage: toy.mileage,
    engineHours: toy.engineHours,
    dryWeight: toy.dryWeight,
    seats: toy.seats,
    lengthM: toy.lengthM,
    beamM: toy.beamM,
    fuelCapacity: toy.fuelCapacity,
    rangeKm: toy.rangeKm,
    trailerIncluded: toy.trailerIncluded,
    registered: toy.registered,
    licence: toy.licence,
    warrantyMonths: toy.warrantyMonths,
    serviceHistory: toy.serviceHistory,
    accidentFree: toy.accidentFree,
    previousOwners: toy.previousOwners,
    firstRegistration: isoDate(toy.firstRegistration),
    colorExterior: toy.colorExterior,
    price: toy.price,
    priceNet: toy.priceNet,
    vatDeductible: toy.vatDeductible,
    oldPrice: toy.oldPrice,
    negotiable: toy.negotiable,
    financingMonthly: toy.financingMonthly,
    equipment: parseJsonArray<string>(toy.equipment),
    videoUrl: toy.videoUrl,
    status: toy.status,
    published: toy.published,
    featured: toy.featured,
    location: toy.location,
    ownerId: toy.ownerId,
    images: toy.images.map((image) => ({ url: image.url, alt: image.alt })),
    translations,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={localePath(locale, "/admin/toys")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
          >
            <IconArrowLeft size={15} />
            {t.admin.toys}
          </Link>
          <h1 className="mt-2 display text-3xl">
            {toy.brand} {toy.model}
          </h1>
          <p className="mt-1 font-mono text-xs text-subtle">
            {toy.reference} · {label(TOY_KINDS, toy.kind, tax)}
          </p>
        </div>

        {toy.published ? (
          <Link
            href={localePath(locale, `/big-toys/${toy.slug}`)}
            target="_blank"
            className="btn btn-ghost btn-sm cursor-pointer"
          >
            <IconEye size={15} />
            {t.cta.viewDetails}
          </Link>
        ) : null}
      </div>

      <ToyForm
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
