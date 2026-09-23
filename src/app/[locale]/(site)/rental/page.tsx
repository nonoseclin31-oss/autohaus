import Link from "next/link";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getQuotableVehicles, getRentalVehicles } from "@/lib/vehicles";
import { VehicleCard } from "@/components/vehicle-card";
import { FinanceSimulator } from "@/components/finance-simulator";
import { Reveal } from "@/components/reveal";
import { RentalSort } from "@/components/rental-sort";
import {
  IconCheckCircle, IconArrowRight, IconTruck, IconUser, IconCar, IconChevronDown,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.rental.title, description: t.meta.rental,
    alternates: pageAlternates(locale, "/rental"),
  };
}

export default async function RentalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  const sort = (await searchParams).sort;
  const vehicles = await getRentalVehicles(locale, 12, typeof sort === "string" ? sort : undefined);

  const steps = [
    { n: "01", title: t.rental.step1Title, body: t.rental.step1Body },
    { n: "02", title: t.rental.step2Title, body: t.rental.step2Body },
    { n: "03", title: t.rental.step3Title, body: t.rental.step3Body },
    { n: "04", title: t.rental.step4Title, body: t.rental.step4Body },
  ];

  const included = [
    t.rental.incl1, t.rental.incl2, t.rental.incl3,
    t.rental.incl4, t.rental.incl5, t.rental.incl6,
  ];

  const faq = [
    { q: t.rental.q1, a: t.rental.a1 },
    { q: t.rental.q2, a: t.rental.a2 },
    { q: t.rental.q3, a: t.rental.a3 },
    { q: t.rental.q4, a: t.rental.a4 },
    { q: t.rental.q5, a: t.rental.a5 },
  ];

  // The simulator quotes any car on sale, not only the ones listed below:
  // both formulas are offered across the showroom.
  const quotable = await getQuotableVehicles();

  return (
    <>
      {/* Hero */}
      <section className="studio relative overflow-hidden border-b border-line">
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="eyebrow mb-4 animate-rise">
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            {t.rental.badge}
          </p>
          <h1
            className="animate-rise max-w-3xl display text-[clamp(2.5rem,6vw,4.5rem)]"
            style={{ animationDelay: "60ms" }}
          >
            {t.rental.title}
          </h1>
          <p
            className="animate-rise mt-5 max-w-2xl text-lg leading-relaxed text-muted"
            style={{ animationDelay: "120ms" }}
          >
            {t.rental.subtitle}
          </p>
          <div className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ animationDelay: "180ms" }}>
            <a href="#calculator" className="btn btn-gold btn-lg cursor-pointer">
              {t.rental.heroCta}
              <IconArrowRight size={18} />
            </a>
            <a href="#offers" className="btn btn-ghost btn-lg cursor-pointer">
              {t.rental.offersTitle}
            </a>
          </div>
        </div>
        <div className="flag-rule" />
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal className="mb-10">
          <h2 className="display text-3xl sm:text-4xl">
            {t.rental.howTitle}
          </h2>
        </Reveal>
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 80}>
              <div className="h-full rounded-sm border border-line bg-surface p-5">
                <span className="display text-4xl text-red">{step.n}</span>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* What's included + audience */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <h2 className="mb-6 display text-3xl">
              {t.rental.includedTitle}
            </h2>
            <ul className="space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <IconCheckCircle size={19} className="mt-0.5 shrink-0 text-bronze" />
                  <span className="text-muted">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100}>
            <h2 className="mb-6 display text-3xl">
              {t.rental.audienceTitle}
            </h2>
            <div className="space-y-4">
              <div className="rounded-sm border border-line bg-surface-2 p-5">
                <div className="mb-2 flex items-center gap-2.5">
                  <IconTruck size={20} className="text-red" />
                  <h3 className="text-base font-semibold">{t.rental.businessTitle}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted">{t.rental.businessBody}</p>
              </div>
              <div className="rounded-sm border border-line bg-surface-2 p-5">
                <div className="mb-2 flex items-center gap-2.5">
                  <IconUser size={20} className="text-red" />
                  <h3 className="text-base font-semibold">{t.rental.privateTitle}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted">{t.rental.privateBody}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Calculator */}
      <section id="calculator" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal className="mb-8">
          <h2 className="display text-3xl sm:text-4xl">
            {t.rental.calcTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-muted">{t.rental.calcBody}</p>
        </Reveal>
        <Reveal delay={80}>
          <FinanceSimulator locale={locale} vehicles={quotable} />
        </Reveal>
      </section>

      {/* Offers */}
      <section id="offers" className="border-y border-line bg-surface scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          {/* The sort sits on the heading row on a wide screen and drops
              under it on a phone, where a select beside a 2.25rem heading
              would squeeze both. */}
          <Reveal className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="display text-3xl sm:text-4xl">
                {t.rental.offersTitle}
              </h2>
              <p className="mt-2 text-muted">{t.rental.offersSubtitle}</p>
            </div>
            {vehicles.length ? <RentalSort locale={locale} /> : null}
          </Reveal>

          {vehicles.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle, i) => (
                <Reveal key={vehicle.id} delay={i * 60}>
                  <VehicleCard vehicle={vehicle} locale={locale} showRental priority={i < 3} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <IconCar size={40} className="text-subtle" />
              <p className="max-w-md text-muted">{t.rental.noOffers}</p>
              <Link href={localePath(locale, "/contact")} className="btn btn-primary btn-sm mt-2 cursor-pointer">
                {t.cta.contactUs}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal className="mb-8">
          <h2 className="display text-3xl sm:text-4xl">
            {t.rental.faqTitle}
          </h2>
        </Reveal>
        <div className="space-y-3">
          {faq.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <details className="group rounded-sm border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold transition-colors duration-200 hover:text-red">
                  {item.q}
                  <IconChevronDown
                    size={18}
                    className="shrink-0 text-subtle transition-transform duration-300 group-open:rotate-180"
                  />
                </summary>
                <div className="border-t border-line px-5 py-4 text-sm leading-relaxed text-muted">{item.a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
