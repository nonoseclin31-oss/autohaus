import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { getDictionary, resolveLocale, localePath, formatCurrency, formatNumber } from "@/i18n";
import { listToys, getToyHero, getToyBrands, getToyKindCounts, toyUsage, type ToyFilters } from "@/lib/toys";
import { label, TOY_KINDS, CONDITIONS, isWaterToy, type Locale as TaxLocale } from "@/lib/taxonomy";
import { ToyCard } from "@/components/toy-card";
import { ToyFilters as ToyFilterBar } from "@/components/toy-filters";
import { UniverseScope } from "@/components/universe-scope";
import { Reveal } from "@/components/reveal";
import { StatusVignette } from "@/components/status-vignette";
import {
  IconArrowRight, IconChevronLeft, IconChevronRight, IconCompass, IconImage,
  IconBolt, IconCalendar, IconGauge, IconClock, IconRuler,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return {
    title: t.toys.metaTitle,
    description: t.toys.metaDescription,
    alternates: pageAlternates(locale, "/big-toys"),
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}
function num(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

export default async function BigToysPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const locale = resolveLocale((await params).locale);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);
  const sp = await searchParams;

  // The showcase piece is only lifted out of the collection while the visitor
  // is browsing the whole thing. The moment they filter, they are looking for
  // something specific, and a piece held back at the top would be missing
  // from the results they are reading.
  const filtering = ["kind", "brand", "category", "engineType", "condition", "availableOnly", "sort", "page"]
    .some((key) => typeof sp[key] === "string" && sp[key] !== "");

  const hero = filtering ? null : await getToyHero(locale);

  const filters: ToyFilters = {
    kind: str(sp.kind),
    brand: str(sp.brand),
    category: str(sp.category),
    engineType: str(sp.engineType),
    condition: str(sp.condition),
    availableOnly: sp.availableOnly === "1",
    sort: str(sp.sort),
    excludeId: hero?.id,
    page: num(sp.page) ?? 1,
    perPage: PER_PAGE,
  };

  const [{ items, total, page, pageCount }, brands, counts] = await Promise.all([
    listToys(filters, locale),
    getToyBrands(),
    getToyKindCounts(),
  ]);

  const catalogueSize = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const pageHref = (nextPage: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (typeof value === "string" && value && key !== "page") qs.set(key, value);
    }
    if (nextPage > 1) qs.set("page", String(nextPage));
    const query = qs.toString();
    return `${localePath(locale, "/big-toys")}${query ? `?${query}` : ""}#collection`;
  };

  return (
    <div data-universe="toys" className="min-h-screen">
      <UniverseScope />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="tide relative overflow-hidden border-b border-line">
        <div className="caustics pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <p className="toys-eyebrow animate-rise">
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            {t.toys.eyebrow}
          </p>

          <h1
            className="animate-rise toys-display mt-5 text-[clamp(3.5rem,15vw,10rem)]"
            style={{ animationDelay: "60ms" }}
          >
            {t.toys.label}
          </h1>

          <p
            className="animate-rise mt-4 max-w-2xl text-xl font-medium text-bronze sm:text-2xl"
            style={{ animationDelay: "120ms" }}
          >
            {t.toys.tagline}
          </p>

          <p
            className="animate-rise mt-5 max-w-2xl text-base leading-relaxed text-muted"
            style={{ animationDelay: "180ms" }}
          >
            {t.toys.intro}
          </p>

          <div
            className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            style={{ animationDelay: "240ms" }}
          >
            <a href="#collection" className="btn btn-primary btn-lg cursor-pointer">
              {t.toys.collection}
              <IconArrowRight size={18} />
            </a>
            <Link href={localePath(locale, "/contact")} className="btn btn-ghost btn-lg cursor-pointer">
              {t.cta.contactUs}
            </Link>
          </div>
        </div>

        <div className="tide-rule" />
      </section>

      {/* ── The showcase piece ──────────────────────────────── */}
      {hero ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <Reveal>
              <h2 className="toys-eyebrow mb-6">
                <span className="h-px w-8 bg-gold" aria-hidden="true" />
                {t.toys.showcase}
              </h2>
            </Reveal>

            <Reveal delay={80}>
              <article className="card-focus group relative grid overflow-hidden rounded-[18px] border border-line bg-surface lg:grid-cols-[1.35fr_1fr]">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-[26rem]">
                  {hero.coverUrl ? (
                    <Image
                      src={hero.coverUrl}
                      alt={[hero.brand, hero.model, hero.version].filter(Boolean).join(" ")}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      priority
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-subtle">
                      <IconImage size={44} />
                    </div>
                  )}
                  <div className="absolute start-5 top-5 z-10">
                    <StatusVignette status={hero.status} locale={tax} />
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-6 p-6 sm:p-9">
                  <div>
                    <p className="toys-eyebrow">{label(TOY_KINDS, hero.kind, tax)}</p>
                    <h3 className="toys-display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
                      <Link
                        href={localePath(locale, `/big-toys/${hero.slug}`)}
                        className="cursor-pointer outline-none transition-colors duration-200 after:absolute after:inset-0 after:content-[''] group-hover:text-red"
                      >
                        {hero.brand} {hero.model}
                      </Link>
                    </h3>
                    <p className="mt-2 text-base text-muted">
                      {hero.version ?? hero.headline ?? label(CONDITIONS, hero.condition, tax)}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 text-sm">
                    <HeroFigure icon={<IconCalendar size={15} />} term={t.spec.year} value={String(hero.year)} />
                    <HeroFigure
                      icon={<IconBolt size={15} />}
                      term={t.spec.power}
                      value={`${formatNumber(hero.powerHp, locale)} ${t.common.hp}`}
                    />
                    {(() => {
                      const usage = toyUsage(hero);
                      if (!usage) return null;
                      return (
                        <HeroFigure
                          icon={usage.unit === "km" ? <IconGauge size={15} /> : <IconClock size={15} />}
                          term={usage.unit === "km" ? t.spec.mileage : t.toys.hours}
                          value={`${formatNumber(usage.value, locale)} ${usage.unit === "km" ? t.common.km : t.toys.hoursShort}`}
                        />
                      );
                    })()}
                    {isWaterToy(hero.kind) && hero.lengthM ? (
                      <HeroFigure
                        icon={<IconRuler size={15} />}
                        term={t.toys.length}
                        value={`${formatNumber(hero.lengthM, locale)} m`}
                      />
                    ) : hero.displacement ? (
                      <HeroFigure
                        icon={<IconCompass size={15} />}
                        term={t.toys.displacement}
                        value={`${formatNumber(hero.displacement, locale)} cm³`}
                      />
                    ) : null}
                  </dl>

                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-semibold tracking-[-0.02em] tabular-nums">
                        {formatCurrency(hero.price, locale)}
                      </p>
                      <p className="mt-0.5 text-xs text-subtle">
                        {hero.vatDeductible ? t.detail.vatDeductible : t.detail.vatIncluded}
                      </p>
                    </div>
                    <span className="btn btn-primary pointer-events-none cursor-pointer">
                      {t.cta.viewDetails}
                      <IconArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </article>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ── The collection ──────────────────────────────────── */}
      <section id="collection" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <Reveal className="mb-8">
            <h2 className="toys-display text-[clamp(2rem,5vw,3rem)]">{t.toys.collection}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">{t.toys.collectionSub}</p>
          </Reveal>

          {catalogueSize > 0 ? (
            <>
              <div className="mb-10">
                <ToyFilterBar locale={locale} brands={brands} counts={counts} total={total} />
              </div>

              {items.length ? (
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((toy, index) => (
                    <Reveal as="li" key={toy.id} delay={Math.min(index, 5) * 60}>
                      <ToyCard toy={toy} locale={locale} priority={index < 3} />
                    </Reveal>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-[18px] border border-line bg-surface px-6 py-20 text-center">
                  <IconCompass size={44} className="text-subtle" />
                  <p className="text-muted">{t.toys.noMatch}</p>
                  <Link
                    href={localePath(locale, "/big-toys")}
                    className="btn btn-ghost btn-sm mt-2 cursor-pointer"
                  >
                    {t.toys.clearFilters}
                  </Link>
                </div>
              )}

              {pageCount > 1 ? (
                <nav
                  className="mt-12 flex items-center justify-center gap-3"
                  aria-label={t.common.page}
                >
                  <Link
                    href={pageHref(Math.max(1, page - 1))}
                    aria-label={t.common.previous}
                    className={cn(
                      "btn btn-ghost cursor-pointer",
                      page === 1 && "pointer-events-none opacity-40",
                    )}
                  >
                    <IconChevronLeft size={16} />
                    {t.common.previous}
                  </Link>
                  <span className="text-sm text-muted tabular-nums">
                    {t.common.page} {page} {t.common.of} {pageCount}
                  </span>
                  <Link
                    href={pageHref(Math.min(pageCount, page + 1))}
                    aria-label={t.common.next}
                    className={cn(
                      "btn btn-ghost cursor-pointer",
                      page === pageCount && "pointer-events-none opacity-40",
                    )}
                  >
                    {t.common.next}
                    <IconChevronRight size={16} />
                  </Link>
                </nav>
              ) : null}
            </>
          ) : (
            /* Nothing published yet. The page still has to say something
               worth reading, or the section launches as a dead end. */
            <div className="flex flex-col items-center gap-4 rounded-[18px] border border-line bg-surface px-6 py-20 text-center">
              <IconCompass size={48} className="text-bronze" />
              <h3 className="toys-display text-3xl">{t.toys.empty}</h3>
              <p className="max-w-md text-sm leading-relaxed text-muted">{t.toys.emptyHint}</p>
              <Link href={localePath(locale, "/contact")} className="btn btn-primary mt-3 cursor-pointer">
                {t.cta.contactUs}
                <IconArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function HeroFigure({
  icon,
  term,
  value,
}: {
  icon: React.ReactNode;
  term: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-subtle">
        <span className="text-bronze">{icon}</span>
        {term}
      </dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
