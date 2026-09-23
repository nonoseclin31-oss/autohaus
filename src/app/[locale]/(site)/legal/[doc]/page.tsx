import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getDictionary, resolveLocale } from "@/i18n";
import { IconAlert } from "@/components/icons";
import { getCompany } from "@/lib/company";
import { imprintSections, privacySections, termsSections } from "@/lib/legal";

const DOCS = ["imprint", "privacy", "terms"] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

function titleFor(doc: Doc, t: ReturnType<typeof getDictionary>) {
  return doc === "imprint" ? t.footer.imprint : doc === "privacy" ? t.footer.privacy : t.footer.terms;
}

/**
 * Kept out of search results. Nobody looks for a dealership through its
 * privacy policy, and three near-identical legal pages per language would
 * only dilute the pages people do search for. They stay one click away in
 * the footer, which is what the law asks of the Impressum.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}): Promise<Metadata> {
  const { locale: raw, doc } = await params;
  const locale = resolveLocale(raw);
  const t = getDictionary(locale);
  if (!DOCS.includes(doc as Doc)) return { title: "404", robots: { index: false, follow: true } };
  const title = titleFor(doc as Doc, t);
  return pageMetadata({ locale, path: `/legal/${doc}`, title, description: `${title} — Autohaus Motion GmbH.`, noindex: true });
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale: raw, doc } = await params;
  if (!DOCS.includes(doc as Doc)) notFound();

  const locale = resolveLocale(raw);
  const t = getDictionary(locale);
  const company = await getCompany();
  const title = titleFor(doc as Doc, t);
  const sections =
    doc === "imprint"
      ? imprintSections(company, locale)
      : doc === "privacy"
        ? privacySections(company, locale)
        : termsSections(company, locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="display text-4xl">{title}</h1>
      <div className="flag-rule mt-4 w-24" />

      <div className="mt-8 space-y-5 leading-relaxed text-muted">
        <section className="rounded-sm border border-line bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold">
            {company.legalName}
          </h2>
          <address className="space-y-1 not-italic text-sm">
            <p>{company.street}</p>
            <p>
              {company.postalCode} {company.city}, {company.country}
            </p>
            <p className="tabular-nums">{company.phone}</p>
            <p>{company.email}</p>
          </address>
        </section>

        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-base font-semibold text-fg">{section.heading}</h2>
            {section.lines.map((line, index) => (
              <p key={index} className={index ? "mt-2" : undefined}>{line}</p>
            ))}
          </section>
        ))}

        <p className="flex items-start gap-2.5 rounded-sm border border-gold/45 bg-gold-wash px-4 py-3 text-sm text-fg">
          <IconAlert size={17} className="mt-0.5 shrink-0 text-bronze" />
          <span>{t.footer.legalNotice}</span>
        </p>
      </div>
    </div>
  );
}
