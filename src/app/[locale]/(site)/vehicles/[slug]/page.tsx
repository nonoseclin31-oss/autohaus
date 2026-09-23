import Link from "next/link";
import { getCompany } from "@/lib/company";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getDictionary, resolveLocale, localePath, formatCurrency, formatNumber, formatDate, formatMonthYear,
  type Dictionary, type Locale,
} from "@/i18n";
import { breadcrumbSchema, clip, fill, listingSnippet, ownDescription, pageMetadata, vehicleSchema } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { FinanceSimulator } from "@/components/finance-simulator";
import { getVehicleBySlug, getSimilarVehicles, vehicleTitle, vehicleTranslation } from "@/lib/vehicles";
import { prisma } from "@/lib/prisma";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { VehicleCard } from "@/components/vehicle-card";
import { LeadForm } from "@/components/lead-form";
import { StatusVignette } from "@/components/status-vignette";
import {
  IconCalendar, IconGauge, IconFuel, IconGearbox, IconBolt, IconCheck, IconAlert,
  IconArrowLeft, IconShield, IconEuro, IconUser, IconPhone, IconMail,
} from "@/components/icons";
import {
  BODY_TYPES, CONDITIONS, FUELS, TRANSMISSIONS, DRIVETRAINS, PAINT_TYPES, UPHOLSTERY,
  EMISSION_CLASSES, SEGMENTS, COLORS, EQUIPMENT, EQUIPMENT_GROUPS, equipmentLabel,
  label, type Locale as TaxLocale,
} from "@/lib/taxonomy";
import { parseJsonArray, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle || !vehicle.published) return { title: "404", robots: { index: false, follow: true } };
  const t = getDictionary(locale);

  return pageMetadata({
    locale,
    path: `/vehicles/${vehicle.slug}`,
    title: listingTitle(vehicle, t),
    description: vehicleSnippet(vehicle, locale, t),
    image: vehicle.images[0]?.url,
  });
}

/**
 * "Porsche 911 Carrera 4S PDK 2022 à vendre". The year is part of what people
 * type; "for sale" is the other half, and is dropped once the car is sold.
 */
function listingTitle(vehicle: { brand: string; model: string; version: string | null; year: number; status: string }, t: Dictionary) {
  const name = `${vehicleTitle(vehicle)} ${vehicle.year}`;
  return vehicle.status === "SOLD" ? name : fill(t.meta.forSale, name);
}

function vehicleSnippet(
  vehicle: NonNullable<Awaited<ReturnType<typeof getVehicleBySlug>>>,
  locale: Locale,
  t: Dictionary,
) {
  return listingSnippet(
    locale,
    [
      String(vehicle.year),
      `${formatNumber(vehicle.mileage, locale)} ${t.common.km}`,
      `${vehicle.powerHp} ${t.common.hp}`,
      formatCurrency(vehicle.price, locale),
    ],
    ownDescription(vehicle.translations, locale),
    t.meta.listingSuffix,
  );
}

type SpecRow = { label: string; value: string | null; icon?: React.ReactNode };

function SpecList({ rows, title }: { rows: SpecRow[]; title: string }) {
  const visible = rows.filter((row) => row.value && row.value !== "—");
  if (!visible.length) return null;
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      <dl className="rounded-sm border border-line bg-surface px-4">
        {visible.map((row) => (
          <div key={row.label} className="spec-row">
            <dt className="flex items-center gap-2">
              {row.icon}
              {row.label}
            </dt>
            <dd className="tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);
  const company = await getCompany();

  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle || !vehicle.published) notFound();

  // Fire-and-forget view counter.
  prisma.vehicle.update({ where: { id: vehicle.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const tr = vehicleTranslation(vehicle.translations, locale);
  const title = vehicleTitle(vehicle);
  const equipment = parseJsonArray<string>(vehicle.equipment);
  const similar = await getSimilarVehicles(vehicle, locale, 3);

  const yesNo = (value: boolean) => (value ? t.common.yes : t.common.no);

  const keyFacts = [
    { Icon: IconCalendar, label: t.spec.year, value: String(vehicle.year) },
    { Icon: IconGauge, label: t.spec.mileage, value: `${formatNumber(vehicle.mileage, locale)} ${t.common.km}` },
    { Icon: IconFuel, label: t.spec.fuel, value: label(FUELS, vehicle.fuel, tax) },
    { Icon: IconGearbox, label: t.spec.transmission, value: label(TRANSMISSIONS, vehicle.transmission, tax) },
    { Icon: IconBolt, label: t.spec.power, value: `${vehicle.powerHp} ${t.common.hp}` },
    { Icon: IconShield, label: t.spec.condition, value: label(CONDITIONS, vehicle.condition, tax) },
  ];

  const engineRows: SpecRow[] = [
    { label: t.spec.engineSize, value: vehicle.engineSize ? `${formatNumber(vehicle.engineSize, locale, { minimumFractionDigits: 1 })} L` : null },
    { label: t.spec.cylinders, value: vehicle.cylinders ? String(vehicle.cylinders) : null },
    { label: t.spec.power, value: `${vehicle.powerHp} ${t.common.hp}${vehicle.powerKw ? ` (${vehicle.powerKw} kW)` : ""}` },
    { label: t.spec.torque, value: vehicle.torqueNm ? `${vehicle.torqueNm} Nm` : null },
    { label: t.spec.transmission, value: label(TRANSMISSIONS, vehicle.transmission, tax) },
    { label: t.spec.gears, value: vehicle.gears ? String(vehicle.gears) : null },
    { label: t.spec.drivetrain, value: vehicle.drivetrain ? label(DRIVETRAINS, vehicle.drivetrain, tax) : null },
    { label: t.spec.acceleration, value: vehicle.acceleration ? `${formatNumber(vehicle.acceleration, locale, { minimumFractionDigits: 1 })} s` : null },
    { label: t.spec.topSpeed, value: vehicle.topSpeed ? `${vehicle.topSpeed} km/h` : null },
  ];

  const energyRows: SpecRow[] = [
    { label: t.spec.consumptionCombined, value: vehicle.consumptionCombined ? `${formatNumber(vehicle.consumptionCombined, locale, { minimumFractionDigits: 1 })} l/100 km` : null },
    { label: t.spec.consumptionUrban, value: vehicle.consumptionUrban ? `${formatNumber(vehicle.consumptionUrban, locale, { minimumFractionDigits: 1 })} l/100 km` : null },
    { label: t.spec.consumptionHighway, value: vehicle.consumptionHighway ? `${formatNumber(vehicle.consumptionHighway, locale, { minimumFractionDigits: 1 })} l/100 km` : null },
    { label: t.spec.co2, value: vehicle.co2 !== null ? `${vehicle.co2} g/km` : null },
    { label: t.spec.emissionClass, value: vehicle.emissionClass ? label(EMISSION_CLASSES, vehicle.emissionClass, tax) : null },
    { label: t.spec.energyLabel, value: vehicle.energyLabel },
    { label: t.spec.battery, value: vehicle.batteryCapacity ? `${formatNumber(vehicle.batteryCapacity, locale, { minimumFractionDigits: 1 })} kWh` : null },
    { label: t.spec.range, value: vehicle.electricRange ? `${formatNumber(vehicle.electricRange, locale)} ${t.common.km}` : null },
    { label: t.spec.charging, value: vehicle.chargingTime },
  ];

  const bodyRows: SpecRow[] = [
    { label: t.spec.bodyType, value: label(BODY_TYPES, vehicle.bodyType, tax) },
    { label: t.vehicles.segment, value: vehicle.segment ? label(SEGMENTS, vehicle.segment, tax) : null },
    { label: t.spec.doors, value: vehicle.doors ? String(vehicle.doors) : null },
    { label: t.spec.seats, value: vehicle.seats ? String(vehicle.seats) : null },
    { label: t.spec.colorExterior, value: vehicle.colorExterior ? label(COLORS, vehicle.colorExterior, tax) : null },
    { label: t.spec.paint, value: vehicle.paintType ? label(PAINT_TYPES, vehicle.paintType, tax) : null },
    { label: t.spec.colorInterior, value: vehicle.colorInterior ? label(COLORS, vehicle.colorInterior, tax) : null },
    { label: t.spec.upholstery, value: vehicle.upholstery ? label(UPHOLSTERY, vehicle.upholstery, tax) : null },
  ];

  const historyRows: SpecRow[] = [
    { label: t.spec.firstRegistration, value: vehicle.firstRegistration ? formatMonthYear(vehicle.firstRegistration, locale) : null },
    { label: t.spec.mileage, value: `${formatNumber(vehicle.mileage, locale)} ${t.common.km}` },
    { label: t.spec.owners, value: vehicle.previousOwners !== null ? String(vehicle.previousOwners) : null },
    { label: t.spec.serviceHistory, value: yesNo(vehicle.serviceHistory) },
    { label: t.spec.accidentFree, value: yesNo(vehicle.accidentFree) },
    { label: t.spec.nonSmoker, value: yesNo(vehicle.nonSmoker) },
    { label: t.spec.imported, value: vehicle.imported ? t.common.yes : null },
    { label: t.spec.warranty, value: vehicle.warrantyMonths ? `${vehicle.warrantyMonths} ${t.common.months}` : null },
    { label: t.spec.nextInspection, value: vehicle.nextInspection ? formatDate(vehicle.nextInspection, locale) : null },
    { label: t.spec.vin, value: vehicle.vin },
    { label: t.spec.location, value: vehicle.location ?? `${company.postalCode} ${company.city}` },
  ];

  const groupedEquipment = Object.keys(EQUIPMENT_GROUPS)
    .map((group) => ({
      group,
      items: equipment.filter((key) => EQUIPMENT[key]?.group === group),
    }))
    .filter((g) => g.items.length);

  // The listing's own words in this language when it has them; otherwise the
  // same figures-first line the search result shows.
  const own = ownDescription(vehicle.translations, locale);
  const schemaDescription = own ? clip(own, locale, 500) : vehicleSnippet(vehicle, locale, t);

  return (
    <>
      {/* The listing as a Car and a Product with an Offer, so a result can
          carry the price, year and mileage; plus where the page sits. */}
      <JsonLd data={vehicleSchema(locale, vehicle, schemaDescription, label(BODY_TYPES, vehicle.bodyType, tax))} />
      <JsonLd
        data={breadcrumbSchema(locale, [
          { name: t.nav.home, path: "" },
          { name: t.nav.vehicles, path: "/vehicles" },
          { name: vehicleTitle(vehicle), path: `/vehicles/${vehicle.slug}` },
        ])}
      />

      {/* Breadcrumb */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <Link
            href={localePath(locale, "/vehicles")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-muted transition-colors duration-200 hover:text-fg"
          >
            <IconArrowLeft size={15} />
            {t.nav.vehicles}
          </Link>
          <span className="text-subtle">/</span>
          <span className="line-clamp-1 text-fg">{title}</span>
        </div>
      </div>

      {/* Status notice */}
      {vehicle.status === "SOLD" || vehicle.status === "RESERVED" ? (
        <div
          className={cn(
            "border-b",
            vehicle.status === "SOLD" ? "border-red/40 bg-red/12" : "border-red-deep/50 bg-red-deep/12",
          )}
        >
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <IconAlert size={18} className="mt-0.5 shrink-0 text-red" />
            <p className="text-sm text-fg">
              {vehicle.status === "SOLD" ? t.detail.soldNotice : t.detail.reservedNotice}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* ── Left column ── */}
          <div className="space-y-10">
            <VehicleGallery
              images={vehicle.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))}
              title={title}
              locale={locale}
              status={vehicle.status}
            />

            {/* Key facts */}
            <section>
              <h2 className="mb-4 display text-2xl">
                {t.detail.keyFacts}
              </h2>
              <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
                {keyFacts.map(({ Icon, label: factLabel, value }) => (
                  <li key={factLabel} className="bg-surface px-4 py-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-subtle">
                      <Icon size={14} className="text-red" />
                      {factLabel}
                    </div>
                    <p className="mt-1.5 text-base font-semibold tabular-nums">{value}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* Description */}
            {tr?.description ? (
              <section>
                <h2 className="mb-4 display text-2xl">
                  {t.detail.description}
                </h2>
                {tr.headline ? (
                  <p className="mb-3 text-lg font-semibold text-bronze">{tr.headline}</p>
                ) : null}
                <div className="max-w-prose space-y-3 leading-relaxed text-muted">
                  {tr.description.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Technical data */}
            <section>
              <h2 className="mb-5 display text-2xl">
                {t.detail.specifications}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <SpecList title={t.detail.engine} rows={engineRows} />
                <SpecList title={t.detail.consumption} rows={energyRows} />
                <SpecList title={t.detail.body} rows={bodyRows} />
                <SpecList title={t.detail.history} rows={historyRows} />
              </div>
            </section>

            {/* Equipment */}
            {groupedEquipment.length ? (
              <section>
                <h2 className="mb-5 display text-2xl">
                  {t.detail.equipment}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {groupedEquipment.map(({ group, items }) => (
                    <div key={group}>
                      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
                        {label(EQUIPMENT_GROUPS, group, tax)}
                      </h3>
                      <ul className="space-y-1.5">
                        {items.map((key) => (
                          <li key={key} className="flex items-start gap-2 text-sm text-muted">
                            <IconCheck size={15} className="mt-0.5 shrink-0 text-red" />
                            {equipmentLabel(key, tax)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Video */}
            {vehicle.videoUrl ? (
              <section>
                <h2 className="mb-4 display text-2xl">
                  {t.detail.gallery}
                </h2>
                <a
                  href={vehicle.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost cursor-pointer"
                >
                  {vehicle.videoUrl}
                </a>
              </section>
            ) : null}
          </div>

          {/* ── Right column: sticky purchase panel ── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-5 rounded-sm border border-line bg-surface p-5">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="chip">{vehicle.reference}</span>
                  <StatusVignette status={vehicle.status} locale={tax} />
                </div>
                <h1 className="display text-3xl">
                  {vehicle.brand} {vehicle.model}
                </h1>
                {vehicle.version ? <p className="mt-1 text-muted">{vehicle.version}</p> : null}
              </div>

              <div className="border-y border-line py-4">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="display text-4xl tabular-nums">
                    {formatCurrency(vehicle.price, locale)}
                  </span>
                  {vehicle.oldPrice && vehicle.oldPrice > vehicle.price ? (
                    <span className="text-lg text-subtle line-through tabular-nums">
                      {formatCurrency(vehicle.oldPrice, locale)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-subtle">
                  {vehicle.vatDeductible ? t.detail.vatDeductible : t.detail.vatIncluded}
                  {vehicle.priceNet ? ` · ${t.detail.netPrice} ${formatCurrency(vehicle.priceNet, locale)}` : ""}
                </p>

                {vehicle.financingMonthly ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                    <IconEuro size={15} className="text-red" />
                    {t.detail.financing} {t.common.from}{" "}
                    <strong className="font-semibold tabular-nums">
                      {formatCurrency(vehicle.financingMonthly, locale)}
                    </strong>
                    {t.common.perMonth}
                  </p>
                ) : null}

                {vehicle.rentalAvailable && vehicle.rentalMonthly ? (
                  <div className="mt-3 rounded-sm border border-gold/45 bg-gold-wash px-3 py-2.5">
                    <p className="text-xs uppercase tracking-wider text-bronze">{t.rental.badge}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {t.detail.monthlyFrom}{" "}
                      <strong className="text-xl font-semibold text-bronze tabular-nums">
                        {formatCurrency(vehicle.rentalMonthly, locale)}
                      </strong>
                      <span className="text-xs">{t.common.perMonth}</span>
                    </p>
                    <Link
                      href={localePath(locale, "/rental")}
                      className="link-underline mt-1.5 inline-block cursor-pointer text-xs font-semibold uppercase tracking-wider text-fg"
                    >
                      {t.cta.requestQuote}
                    </Link>
                  </div>
                ) : null}
              </div>

              {/* Advisor */}
              {vehicle.owner ? (
                <div className="flex items-center gap-3 rounded-[3px] border border-line bg-surface-2 p-3">
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-muted">
                    {vehicle.owner.avatarUrl ? (
                      <Image src={vehicle.owner.avatarUrl} alt="" fill sizes="40px" className="object-cover" />
                    ) : (
                      <IconUser size={19} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{vehicle.owner.name}</p>
                    <p className="truncate text-xs text-subtle">{vehicle.owner.jobTitle ?? t.admin.owner}</p>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${company.phone.replace(/\s/g, "")}`} className="btn btn-solid btn-sm cursor-pointer">
                  <IconPhone size={15} />
                  {t.cta.callUs}
                </a>
                <a href={`mailto:${company.email}?subject=${encodeURIComponent(`${title} — ${vehicle.reference}`)}`} className="btn btn-solid btn-sm cursor-pointer">
                  <IconMail size={15} />
                  {t.forms.email}
                </a>
              </div>

              <div className="border-t border-line pt-5">
                <h2 className="mb-1 text-base font-semibold">
                  {t.detail.contactAdvisor}
                </h2>
                <p className="mb-4 text-sm text-muted">{t.detail.contactBody}</p>
                <LeadForm
                  locale={locale}
                  type="SALE"
                  vehicleId={vehicle.id}
                  vehicleLabel={`${title} · ${vehicle.reference}`}
                  compact
                />
              </div>
            </div>
          </div>
        </div>

        {/* Finance — only for a car actually offered on one formula or the
            other. A car sold outright gets no simulator, because configuring
            a lease nobody will sign is worse than not offering one. */}
        {vehicle.rentalAvailable || vehicle.loaAvailable ? (
        <section id="finance" className="mt-16 scroll-mt-24 border-t border-line pt-12">
          <h2 className="display text-3xl">{t.rental.simulatorTitle}</h2>
          <p className="mt-2 max-w-2xl text-muted">{t.rental.simulatorBody}</p>
          <div className="mt-6">
            <FinanceSimulator
              locale={locale}
              vehicles={[
                {
                  id: vehicle.id,
                  label: vehicleTitle(vehicle),
                  price: vehicle.price,
                  lldAvailable: vehicle.rentalAvailable,
                  loaAvailable: vehicle.loaAvailable,
                  financeRate: vehicle.financeRate,
                  residualRate: vehicle.residualRate,
                  servicesMonthly: vehicle.servicesMonthly,
                },
              ]}
            />
          </div>
        </section>
        ) : null}

        {/* Similar */}
        {similar.length ? (
          <section className="mt-16 border-t border-line pt-12">
            <h2 className="mb-6 display text-3xl">
              {t.detail.similarVehicles}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <VehicleCard key={item.id} vehicle={item} locale={locale} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
