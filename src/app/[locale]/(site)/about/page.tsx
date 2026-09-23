import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { getDictionary, resolveLocale, localePath, formatNumber, LOCALE_META } from "@/i18n";
import { Reveal } from "@/components/reveal";
import { IconShield, IconWrench, IconFlag, IconArrowRight } from "@/components/icons";
import { getCompany } from "@/lib/company";
import { getPublicTeam, type TeamMember } from "@/lib/team";
import { getSiteSettings } from "@/lib/site-settings";

// The team at the foot of the page is arranged in the back office, and each
// age moves on a birthday — neither can be baked in at build time.
export const dynamic = "force-dynamic";

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
  const [company, team, site] = await Promise.all([getCompany(), getPublicTeam(locale), getSiteSettings()]);
  // The two paragraphs presenting the company can be rewritten in the back
  // office, per language; a language nobody rewrote keeps the original.
  const intro = {
    body1: site.about[locale]?.body1 ?? t.about.body1,
    body2: site.about[locale]?.body2 ?? t.about.body2,
  };

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
          <p className="whitespace-pre-line text-lg leading-relaxed text-muted">{intro.body1}</p>
          <p className="whitespace-pre-line text-lg leading-relaxed text-muted">{intro.body2}</p>
          <Link href={localePath(locale, "/vehicles")} className="btn btn-primary mt-3 cursor-pointer">
            {t.cta.browseStock}
            <IconArrowRight size={17} />
          </Link>
        </Reveal>

        <Reveal delay={100}>
          <div className="overflow-hidden rounded-sm border border-line bg-surface p-8">
            <Image
              src="/brand/logo.jpg"
              alt={`${company.legalName} — Nürburgring Nordschleife`}
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

      {/* Nobody chosen in the back office means no section at all, rather
          than a heading over an empty grid. */}
      {team.length ? (
        <section className="border-b border-line" aria-labelledby="team-title">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <Reveal className="mb-10">
              <h2 id="team-title" className="display text-3xl sm:text-4xl">
                {t.about.teamTitle}
              </h2>
              <div className="flag-rule mt-4 w-28" />
              <p className="mt-4 max-w-xl text-muted">{t.about.teamIntro}</p>
            </Reveal>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((member, i) => (
                <li key={member.id}>
                  <Reveal delay={Math.min(i, 5) * 90} className="h-full">
                    <TeamCard member={member} age={member.age !== null ? t.about.age.replace("{n}", formatNumber(member.age, locale)) : null} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

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

/** "Katrin Vogel" → "KV": what stands in for a photo nobody has uploaded. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0]!.toLocaleUpperCase()).join("");
}

function TeamCard({ member, age }: { member: TeamMember; age: string | null }) {
  return (
    <article className="flex h-full flex-col rounded-sm border border-line bg-surface p-6">
      <div className="flex items-center gap-4">
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2">
          {member.avatarUrl ? (
            <Image src={member.avatarUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span className="display text-xl text-muted" aria-hidden="true">{initials(member.name)}</span>
          )}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug">{member.name}</h3>
          {member.role || age ? (
            // Each piece isolated: on the Arabic page a French title and an
            // Arabic age would otherwise be reordered into each other.
            <p className="mt-0.5 text-sm text-muted">
              {member.role ? (
                <bdi lang={member.roleLang ? LOCALE_META[member.roleLang].htmlLang : undefined}>{member.role}</bdi>
              ) : null}
              {member.role && age ? <span aria-hidden="true"> · </span> : null}
              {age ? <bdi className="tabular-nums">{age}</bdi> : null}
            </p>
          ) : null}
        </div>
      </div>
      {member.tagline ? (
        // The editorial serif, upright: only its roman is loaded, and a
        // browser-slanted Playfair looks like the imitation it is.
        //
        // A line shown in another language than the page's is set as a
        // paragraph in that language — its own direction, and its own quote
        // marks, which follow the language around the quotation.
        <p
          lang={member.taglineLang ? LOCALE_META[member.taglineLang].htmlLang : undefined}
          dir={member.taglineLang ? LOCALE_META[member.taglineLang].dir : undefined}
          className="mt-5 border-t border-line pt-4 text-base leading-relaxed text-fg/80 [font-family:var(--font-heading)]"
        >
          <q>{member.tagline}</q>
        </p>
      ) : null}
    </article>
  );
}
