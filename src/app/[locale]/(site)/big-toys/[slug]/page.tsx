import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { getDictionary, resolveLocale, localePath, formatCurrency, formatNumber, formatMonthYear } from "@/i18n";
import { getToyBySlug, getSimilarToys, toyTitle, toyEquipment, toyTranslation, toyUsage } from "@/lib/toys";
import {
  label, TOY_KINDS, TOY_CATEGORIES, TOY_ENGINES, TOY_TRANSMISSIONS, TOY_LICENCES,
  CONDITIONS, COLORS, TOY_EQUIPMENT, TOY_EQUIPMENT_GROUPS, toyEquipmentLabel,
  isWaterToy, type Locale as TaxLocale,
} from "@/lib/taxonomy";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { LeadForm } from "@/components/lead-form";
import { ToyCard } from "@/components/toy-card";
import { UniverseScope } from "@/components/universe-scope";
import {
  IconArrowLeft, IconAlert, IconBolt, IconCalendar, IconGauge, IconClock,
  IconRuler, IconSeat, IconEngineBadge, IconCheck, IconPhone, IconMail, IconUser,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  const t = getDictionary(locale);
  const toy = await getToyBySlug(slug);
  if (!toy || !toy.published) return { title: t.toys.label };

  const tr = toyTranslation(toy.translations, locale as TaxLocale);
  const title = toyTitle(toy);

  return {
    title: `${title} — ${label(TOY_KINDS, toy.kind, locale as TaxLocale)}`,
    description:
      tr?.description?.slice(0, 300) ??
      `${title}, ${toy.year}, ${toy.powerHp} ${t.common.hp}. ${t.meta.listingSuffix}`,
    alternates: pageAlternates(locale, `/big-toys/${toy.slug}`),
  };
}

export default async function ToyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = resolveLocale(raw);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);

  const toy = await getToyBySlug(slug);
  if (!toy || !toy.published) notFound();

  // Counted on the way through, and never awaited: a failed counter must not
  // take the page down with it.
  void prisma.toy.update({ where: { id: toy.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const title = toyTitle(toy);
  const tr = toyTranslation(toy.translations, tax);
  const water = isWaterToy(toy.kind);
  const usage = toyUsage(toy);
  const equipment = toyEquipment(toy);
  const similar = await getSimilarToys(toy, locale);

  /** The four figures above the fold, chosen per family. */
  const keyFacts = [
    { Icon: IconCalendar, label: t.spec.year, value: String(toy.year) },
    { Icon: IconBolt, label: t.spec.power, value: `${formatNumber(toy.powerHp, locale)} ${t.common.hp}` },
    usage
      ? {
          Icon: usage.unit === "km" ? IconGauge : IconClock,
          label: usage.unit === "km" ? t.spec.mileage : t.toys.hours,
          value: `${formatNumber(usage.value, locale)} ${usage.unit === "km" ? t.common.km : t.toys.hoursShort}`,
        }
      : null,
    water
      ? toy.lengthM
        ? { Icon: IconRuler, label: t.toys.length, value: `${formatNumber(toy.lengthM, locale)} m` }
        : null
      : toy.displacement
        ? { Icon: IconEngineBadge, label: t.toys.displacement, value: `${formatNumber(toy.displacement, locale)} cm³` }
        : null,
    toy.seats ? { Icon: IconSeat, label: t.toys.seats, value: String(toy.seats) } : null,
    { Icon: IconCheck, label: t.vehicles.condition, value: label(CONDITIONS, toy.condition, tax) },
  ].filter(Boolean) as { Icon: typeof IconBolt; label: string; value: string }[];

  /** The full sheet. Anything not filled in is dropped rather than dashed. */
  const specs: { term: string; value: string }[] = [
    { term: t.toys.category, value: toy.category ? label(TOY_CATEGORIES, toy.category, tax) : "" },
    { term: t.vehicles.fuel, value: label(TOY_ENGINES, toy.engineType, tax) },
    { term: t.toys.displacement, value: toy.displacement ? `${formatNumber(toy.displacement, locale)} cm³` : "" },
    { term: t.toys.cylinders, value: toy.cylinders ? String(toy.cylinders) : "" },
    { term: t.toys.strokes, value: toy.strokes ? `${toy.strokes}${t.toys.strokeValue}` : "" },
    { term: t.vehicles.transmission, value: toy.transmission ? label(TOY_TRANSMISSIONS, toy.transmission, tax) : "" },
    // Only worth a line when there is more than one — "1 engine" is noise.
    { term: t.toys.engines, value: toy.engineCount && toy.engineCount > 1 ? String(toy.engineCount) : "" },
    { term: t.spec.power, value: toy.powerKw ? `${formatNumber(toy.powerKw, locale)} kW` : "" },
    { term: t.spec.torque, value: toy.torqueNm ? `${formatNumber(toy.torqueNm, locale)} Nm` : "" },
    {
      term: t.toys.topSpeed,
      value: toy.topSpeed ? `${formatNumber(toy.topSpeed, locale)} ${water ? t.toys.knots : "km/h"}` : "",
    },
    { term: t.toys.length, value: toy.lengthM ? `${formatNumber(toy.lengthM, locale)} m` : "" },
    { term: t.toys.beam, value: toy.beamM ? `${formatNumber(toy.beamM, locale)} m` : "" },
    { term: t.toys.dryWeight, value: toy.dryWeight ? `${formatNumber(toy.dryWeight, locale)} kg` : "" },
    { term: t.toys.seats, value: toy.seats ? String(toy.seats) : "" },
    { term: t.toys.tank, value: toy.fuelCapacity ? `${formatNumber(toy.fuelCapacity, locale)} L` : "" },
    { term: t.toys.range, value: toy.rangeKm ? `${formatNumber(toy.rangeKm, locale)} ${t.common.km}` : "" },
    { term: t.spec.colorExterior, value: toy.colorExterior ? label(COLORS, toy.colorExterior, tax) : "" },
    { term: t.toys.licence, value: toy.licence ? label(TOY_LICENCES, toy.licence, tax) : "" },
    { term: t.spec.firstRegistration, value: toy.firstRegistration ? formatMonthYear(toy.firstRegistration, locale) : "" },
    { term: t.spec.owners, value: toy.previousOwners !== null ? String(toy.previousOwners) : "" },
    { term: t.spec.warranty, value: toy.warrantyMonths ? `${toy.warrantyMonths} ${t.common.months}` : "" },
    { term: t.toys.hullId, value: toy.hullId ?? "" },
  ].filter((row) => row.value !== "");

  /** Yes/no facts, shown as ticks rather than as rows that say "no". */
  const flags = [
    toy.trailerIncluded ? t.toys.trailer : null,
    toy.registered ? t.toys.registered : null,
    toy.serviceHistory ? t.spec.serviceHistory : null,
    toy.accidentFree ? t.spec.accidentFree : null,
  ].filter(Boolean) as string[];

  const groups = Object.keys(TOY_EQUIPMENT_GROUPS)
    .map((group) => ({
      group,
      keys: equipment.filter((key) => TOY_EQUIPMENT[key]?.group === group),
    }))
    .filter((entry) => entry.keys.length);

  return (
    <div data-universe="toys" className="min-h-screen">
      <UniverseScope />

      {/* Breadcrumb */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <Link
            href={localePath(locale, "/big-toys")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-muted transition-colors duration-200 hover:text-fg"
          >
            <IconArrowLeft size={15} />
            {t.toys.backToCollection}
          </Link>
          <span className="text-subtle">/</span>
          <span className="line-clamp-1 text-fg">{title}</span>
        </div>
      </div>

      {toy.status === "SOLD" || toy.status === "RESERVED" ? (
        <div
          className={cn(
            "border-b",
            toy.status === "SOLD" ? "border-red/40 bg-red/12" : "border-red-deep/50 bg-red-deep/12",
          )}
        >
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <IconAlert size={18} className="mt-0.5 shrink-0 text-red" />
            <p className="text-sm text-fg">
              {toy.status === "SOLD" ? t.detail.soldNotice : t.detail.reservedNotice}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* ── Left column ── */}
          <div className="space-y-10">
            <VehicleGallery
              images={toy.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))}
              title={title}
              locale={locale}
              status={toy.status}
            />

            <section>
              <h2 className="toys-display mb-4 text-2xl">{t.detail.keyFacts}</h2>
              <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-3">
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

            {tr?.description ? (
              <section>
                <h2 className="toys-display mb-4 text-2xl">{t.detail.description}</h2>
                {tr.headline ? (
                  <p className="mb-3 text-lg font-semibold text-bronze">{tr.headline}</p>
                ) : null}
                <div className="max-w-prose space-y-3 leading-relaxed text-muted">
                  {tr.description.split("\n").filter(Boolean).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {specs.length ? (
              <section>
                <h2 className="toys-display mb-4 text-2xl">{t.toys.specs}</h2>
                <dl className="overflow-hidden rounded-[14px] border border-line bg-surface px-5">
                  {specs.map((row) => (
                    <div key={row.term} className="spec-row">
                      <dt>{row.term}</dt>
                      <dd className="tabular-nums">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                {flags.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {flags.map((flag) => (
                      <li
                        key={flag}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red/40 bg-red-wash px-3 py-1.5 text-sm font-medium text-red"
                      >
                        <IconCheck size={13} />
                        {flag}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {groups.length ? (
              <section>
                <h2 className="toys-display mb-4 text-2xl">{t.toys.equipment}</h2>
                <div className="space-y-6">
                  {groups.map(({ group, keys }) => (
                    <div key={group}>
                      <h3 className="toys-eyebrow mb-3">
                        {label(TOY_EQUIPMENT_GROUPS, group, tax)}
                      </h3>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {keys.map((key) => (
                          <li key={key} className="flex items-start gap-2 text-sm text-muted">
                            <IconCheck size={14} className="mt-1 shrink-0 text-red" />
                            {toyEquipmentLabel(key, tax)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* ── Right column: the offer ── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-5 rounded-[18px] border border-line bg-surface p-6">
              <div>
                <p className="toys-eyebrow">{label(TOY_KINDS, toy.kind, tax)}</p>
                <h1 className="toys-display mt-3 text-[clamp(1.85rem,4.5vw,2.75rem)]">{title}</h1>
                {toy.version ? <p className="mt-2 text-sm text-muted">{toy.version}</p> : null}
                <p className="mt-2 font-mono text-xs text-subtle">{toy.reference}</p>
              </div>

              <div className="border-y border-line py-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-4xl font-semibold tracking-[-0.02em] tabular-nums">
                    {formatCurrency(toy.price, locale)}
                  </span>
                  {toy.oldPrice && toy.oldPrice > toy.price ? (
                    <span className="text-base text-subtle line-through tabular-nums">
                      {formatCurrency(toy.oldPrice, locale)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-subtle">
                  {toy.vatDeductible ? t.detail.vatDeductible : t.detail.vatIncluded}
                  {toy.negotiable ? ` · ${t.admin.fNegotiable}` : ""}
                </p>
                {toy.financingMonthly ? (
                  <p className="mt-3 rounded-full bg-gold-wash px-3 py-2 text-center text-sm text-muted">
                    {t.detail.monthlyFrom}{" "}
                    <strong className="font-semibold text-bronze tabular-nums">
                      {formatCurrency(toy.financingMonthly, locale)}
                    </strong>
                    <span className="text-xs">{t.common.perMonth}</span>
                  </p>
                ) : null}
              </div>

              {toy.owner ? (
                <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface-2 p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-muted">
                    <IconUser size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{toy.owner.name}</p>
                    <p className="truncate text-xs text-subtle">
                      {toy.owner.jobTitle ?? t.admin.owner}
                    </p>
                  </div>
                  <div className="ms-auto flex gap-1">
                    {toy.owner.phone ? (
                      <a
                        href={`tel:${toy.owner.phone.replace(/\s/g, "")}`}
                        aria-label={t.cta.callUs}
                        className="cursor-pointer rounded-full p-2.5 text-muted transition-colors duration-200 hover:bg-surface-3 hover:text-fg"
                      >
                        <IconPhone size={16} />
                      </a>
                    ) : null}
                    <a
                      href={`mailto:${toy.owner.email}`}
                      aria-label={t.cta.contactUs}
                      className="cursor-pointer rounded-full p-2.5 text-muted transition-colors duration-200 hover:bg-surface-3 hover:text-fg"
                    >
                      <IconMail size={16} />
                    </a>
                  </div>
                </div>
              ) : null}

              <div>
                <h2 className="toys-display text-xl">{t.toys.enquire}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.toys.enquireSub}</p>
                <div className="mt-4">
                  <LeadForm
                    locale={locale}
                    type="SALE"
                    toyId={toy.id}
                    vehicleLabel={title}
                    subjectLabel={t.admin.relatedToy}
                    compact
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {similar.length ? (
          <section className="mt-16 border-t border-line pt-12">
            <h2 className="toys-display mb-8 text-[clamp(1.75rem,4vw,2.5rem)]">{t.toys.similar}</h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <li key={item.id}>
                  <ToyCard toy={item} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
