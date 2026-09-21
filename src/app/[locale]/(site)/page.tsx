import Link from "next/link";
import Image from "next/image";
import { getDictionary, resolveLocale, localePath, formatNumber, formatCurrency } from "@/i18n";
import { getFeaturedVehicles } from "@/lib/vehicles";
import { prisma } from "@/lib/prisma";
import { JsonLd } from "@/components/json-ld";
import { dealerSchema } from "@/lib/seo";
import { VehicleCard } from "@/components/vehicle-card";
import { Reveal } from "@/components/reveal";
import { QuickSearch } from "@/components/quick-search";
import {
  IconArrowRight, IconShield, IconFlag, IconTruck, IconCar,
  IconCheckCircle, IconEuro, IconImage,
} from "@/components/icons";
import { BODY_TYPES, label, type Locale as TaxLocale } from "@/lib/taxonomy";
import { COMPANY } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);

  const [featured, stockCount, brands] = await Promise.all([
    getFeaturedVehicles(locale, 6),
    prisma.vehicle.count({ where: { published: true, status: { not: "SOLD" } } }),
    prisma.vehicle.findMany({
      where: { published: true },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    }),
  ]);

  const hero = featured[0] ?? null;
  const bodyTypes = ["SUV", "SEDAN", "COUPE", "ESTATE", "CABRIOLET", "HATCHBACK"];

  const whyItems = [
    { Icon: IconShield, title: t.home.why1Title, body: t.home.why1Body },
    { Icon: IconFlag, title: t.home.why2Title, body: t.home.why2Body },
    { Icon: IconEuro, title: t.home.why3Title, body: t.home.why3Body },
    { Icon: IconTruck, title: t.home.why4Title, body: t.home.why4Body },
  ];

  const steps = [
    { n: "01", title: t.home.step1Title, body: t.home.step1Body },
    { n: "02", title: t.home.step2Title, body: t.home.step2Body },
    { n: "03", title: t.home.step3Title, body: t.home.step3Body },
    { n: "04", title: t.home.step4Title, body: t.home.step4Body },
  ];

  return (
    <>
      {/* The dealership itself: name, address and phone, which is what a
          local search result is assembled from. */}
      <JsonLd data={dealerSchema(locale, t.meta.description)} />

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="studio relative overflow-hidden">
        <div className="hairlines absolute inset-0 opacity-70" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
          {/* min-w-0: grid items default to min-width:auto, so long German
              compounds and unbroken CJK runs push this column past the
              viewport at 375px. */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="min-w-0">
              <p className="eyebrow animate-rise">
                <span className="h-px w-10 bg-gold" aria-hidden="true" />
                {t.home.heroBadge}
              </p>

              <h1
                className="display animate-rise mt-6 text-[clamp(2.75rem,6.5vw,5.25rem)]"
                style={{ animationDelay: "60ms" }}
              >
                {t.home.heroTitle}{" "}
                <em className="not-italic text-red">{t.home.heroTitleAccent}</em>
              </h1>

              <p
                className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-muted"
                style={{ animationDelay: "120ms" }}
              >
                {t.home.heroSubtitle}
              </p>

              <div className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ animationDelay: "180ms" }}>
                <Link href={localePath(locale, "/vehicles")} className="btn btn-primary btn-lg cursor-pointer">
                  {t.cta.browseStock}
                  <IconArrowRight size={17} />
                </Link>
                <Link href={localePath(locale, "/rental")} className="btn btn-ghost btn-lg cursor-pointer">
                  {t.nav.rental}
                </Link>
              </div>
            </div>

            {/* Featured vehicle as the hero visual */}
            {hero ? (
              <Reveal delay={120}>
                <Link
                  href={localePath(locale, `/vehicles/${hero.slug}`)}
                  className="group block cursor-pointer overflow-hidden rounded-[4px] border border-line bg-surface shadow-[var(--shadow-md)] transition-shadow duration-300 hover:shadow-[var(--shadow-lg)]"
                >
                  <div className="relative aspect-[16/11] w-full overflow-hidden bg-surface-2">
                    {hero.coverUrl ? (
                      <Image
                        src={hero.coverUrl}
                        alt={`${hero.brand} ${hero.model}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 46vw"
                        priority
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-subtle">
                        <IconImage size={40} />
                      </span>
                    )}
                    <span className="vignette vignette-soon absolute start-4 top-4">
                      {t.home.featuredTitle}
                    </span>
                  </div>

                  {/* Wraps instead of truncating: at 375px the price column
                      squeezes the name below its own width, and a clipped
                      hero title reads as a bug. */}
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 p-5">
                    <div className="min-w-0">
                      <h2 className="display text-xl sm:text-2xl">
                        {hero.brand} {hero.model}
                      </h2>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                        {hero.version ?? `${hero.year}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-xl font-semibold tabular-nums">{formatCurrency(hero.price, locale)}</p>
                      <p className="text-xs text-subtle">{hero.powerHp} {t.common.hp}</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ) : null}
          </div>

          {/* Stats */}
          <dl
            className="animate-rise mt-16 grid grid-cols-2 border-t border-line lg:grid-cols-4"
            style={{ animationDelay: "240ms" }}
          >
            {[
              { value: formatNumber(stockCount, locale), label: t.home.statVehicles },
              { value: "18", label: t.home.statYears },
              { value: "2 400+", label: t.home.statClients },
              { value: "EU", label: t.home.statDelivery },
            ].map((stat) => (
              <div key={stat.label} className="border-b border-line px-1 py-6 sm:px-2 lg:border-b-0">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  {/* bdi + dir=ltr: in Arabic the bidi algorithm moves the
                      trailing "+" of "2 400+" to the front, rendering it as
                      "+400 2". Numbers read left-to-right in every locale. */}
                  <bdi dir="ltr" className="display block text-4xl tabular-nums sm:text-5xl">
                    {stat.value}
                  </bdi>
                  <span className="mt-1.5 block text-sm text-muted">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ──────────────────── Quick search ───────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {t.home.quickSearch}
          </h2>
          <QuickSearch locale={locale} brands={brands.map((b) => b.brand)} />
        </div>
      </section>

      {/* ───────────────────── Featured ──────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-4">
              <span className="h-px w-10 bg-gold" aria-hidden="true" />
              {t.nav.vehicles}
            </p>
            <h2 className="display text-4xl sm:text-5xl">{t.home.featuredTitle}</h2>
            <p className="mt-3 max-w-lg text-muted">{t.home.featuredSubtitle}</p>
          </div>
          <Link
            href={localePath(locale, "/vehicles")}
            className="link-underline cursor-pointer text-xs font-semibold uppercase tracking-[0.14em]"
          >
            {t.cta.seeAll}
          </Link>
        </Reveal>

        {featured.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((vehicle, i) => (
              <Reveal key={vehicle.id} delay={i * 70}>
                <VehicleCard vehicle={vehicle} locale={locale} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <IconCar size={40} className="text-subtle" />
            <p className="text-muted">{t.admin.noData}</p>
          </div>
        )}
      </section>

      {/* ─────────────────── Body categories ─────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mb-10">
            <h2 className="display text-3xl sm:text-4xl">{t.home.categoriesTitle}</h2>
            <p className="mt-3 text-muted">{t.home.categoriesSubtitle}</p>
          </Reveal>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {bodyTypes.map((type, i) => (
              <Reveal as="li" key={type} delay={i * 50}>
                <Link
                  href={`${localePath(locale, "/vehicles")}?bodyType=${type}`}
                  className="group flex cursor-pointer flex-col items-start gap-3 rounded-[3px] border border-line bg-canvas p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-sm)]"
                >
                  <IconCar size={24} className="text-subtle transition-colors duration-300 group-hover:text-red" />
                  <span className="text-sm font-semibold">{label(BODY_TYPES, type, tax)}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ──────────────── Long-term rental teaser ────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Reveal>
            <p className="eyebrow mb-4">
              <span className="h-px w-10 bg-gold" aria-hidden="true" />
              {t.home.rentalTeaserTag}
            </p>
            <h2 className="display text-4xl sm:text-5xl">{t.home.rentalTeaserTitle}</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{t.home.rentalTeaserBody}</p>
            <Link href={localePath(locale, "/rental")} className="btn btn-dark btn-lg mt-8 cursor-pointer">
              {t.rental.heroCta}
              <IconArrowRight size={17} />
            </Link>
          </Reveal>

          <Reveal delay={120}>
            <ul className="overflow-hidden rounded-[4px] border border-line bg-surface">
              {[t.rental.incl1, t.rental.incl2, t.rental.incl3, t.rental.incl4, t.rental.incl5, t.rental.incl6].map(
                (item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 border-b border-line px-5 py-4 last:border-b-0"
                  >
                    <IconCheckCircle size={18} className="mt-0.5 shrink-0 text-bronze" />
                    <span className="text-sm">{item}</span>
                  </li>
                ),
              )}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ──────────────────────── Why us ─────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <Reveal className="mb-14 max-w-2xl">
            <h2 className="display text-4xl sm:text-5xl">{t.home.whyTitle}</h2>
            <div className="flag-rule mt-6 w-28" />
          </Reveal>

          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map(({ Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="flex h-full flex-col gap-3 border-t border-line pt-6">
                  <Icon size={24} className="text-red" />
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── Process ────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal className="mb-14">
          <p className="eyebrow mb-4">
            <span className="h-px w-10 bg-gold" aria-hidden="true" />
            {COMPANY.shortName}
          </p>
          <h2 className="display text-4xl sm:text-5xl">{t.home.processTitle}</h2>
        </Reveal>

        <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 80}>
              <div className="h-full">
                <span className="display block text-5xl text-numeral">{step.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ────────────────────── Closing CTA ──────────────────── */}
      <section className="border-t border-line bg-ink text-white">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="display text-4xl text-white sm:text-5xl">{t.home.ctaTitle}</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">{t.home.ctaBody}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link href={localePath(locale, "/contact")} className="btn btn-primary btn-lg cursor-pointer">
                {t.cta.contactUs}
                <IconArrowRight size={17} />
              </Link>
              <a
                href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                className="btn btn-lg cursor-pointer border-white/25 text-white transition-colors duration-200 hover:bg-white/10"
              >
                {t.cta.callUs}
              </a>
            </div>
          </Reveal>
        </div>
        <div className="flag-rule" />
      </section>
    </>
  );
}
