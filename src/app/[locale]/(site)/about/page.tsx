import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { Reveal } from "@/components/reveal";
import { IconShield, IconWrench, IconFlag, IconArrowRight } from "@/components/icons";
import { COMPANY } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.meta.aboutTitle, description: t.meta.about,
    alternates: pageAlternates(locale, "/about"),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);

  const values = [
    { Icon: IconShield, title: t.about.v1Title, body: t.about.v1Body },
    { Icon: IconWrench, title: t.about.v2Title, body: t.about.v2Body },
    { Icon: IconFlag, title: t.about.v3Title, body: t.about.v3Body },
  ];

  return (
    <>
      <section className="studio border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="eyebrow mb-4">
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            {t.nav.about}
          </p>
          <h1 className="max-w-3xl display text-[clamp(2.25rem,5.5vw,4rem)]">
            {t.about.title}
          </h1>
          <p className="mt-4 text-lg text-muted">{t.about.subtitle}</p>
        </div>
        <div className="flag-rule" />
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Reveal className="space-y-5">
          <p className="text-lg leading-relaxed text-muted">{t.about.body1}</p>
          <p className="text-lg leading-relaxed text-muted">{t.about.body2}</p>
          <Link href={localePath(locale, "/vehicles")} className="btn btn-primary mt-3 cursor-pointer">
            {t.cta.browseStock}
            <IconArrowRight size={17} />
          </Link>
        </Reveal>

        <Reveal delay={100}>
          <div className="overflow-hidden rounded-sm border border-line bg-surface p-8">
            <Image
              src="/brand/logo.jpg"
              alt={`${COMPANY.legalName} — Nürburgring Nordschleife`}
              width={900}
              height={900}
              className="h-auto w-full object-contain"
            />
          </div>
        </Reveal>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal className="mb-10">
            <h2 className="display text-3xl sm:text-4xl">
              {t.about.valuesTitle}
            </h2>
            <div className="flag-rule mt-4 w-28" />
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map(({ Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="h-full border-t-2 border-red pt-5">
                  <Icon size={26} className="text-red" />
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="display text-3xl">{t.home.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">{t.home.ctaBody}</p>
          <Link href={localePath(locale, "/contact")} className="btn btn-primary btn-lg mt-6 cursor-pointer">
            {t.cta.contactUs}
            <IconArrowRight size={18} />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
