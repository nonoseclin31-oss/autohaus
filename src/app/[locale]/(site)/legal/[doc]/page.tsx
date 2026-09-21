import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { getDictionary, resolveLocale } from "@/i18n";
import { IconAlert } from "@/components/icons";
import { COMPANY } from "@/lib/utils";

const DOCS = ["imprint", "privacy", "terms"] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

function titleFor(doc: Doc, t: ReturnType<typeof getDictionary>) {
  return doc === "imprint" ? t.footer.imprint : doc === "privacy" ? t.footer.privacy : t.footer.terms;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}): Promise<Metadata> {
  const { locale, doc } = await params;
  const t = getDictionary(locale);
  if (!DOCS.includes(doc as Doc)) return { title: "404" };
  return {
    title: titleFor(doc as Doc, t),
    alternates: pageAlternates(locale, `/legal/${doc}`),
  };
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
  const title = titleFor(doc as Doc, t);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="display text-4xl">{title}</h1>
      <div className="flag-rule mt-4 w-24" />

      <div className="mt-8 space-y-5 leading-relaxed text-muted">
        <section className="rounded-sm border border-line bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold">
            {COMPANY.legalName}
          </h2>
          <address className="space-y-1 not-italic text-sm">
            <p>{COMPANY.street}</p>
            <p>
              {COMPANY.postalCode} {COMPANY.city}, {COMPANY.country}
            </p>
            <p className="tabular-nums">{COMPANY.phone}</p>
            <p>{COMPANY.email}</p>
          </address>
        </section>

        {/* These bodies were written straight into the page in English and
            German, so a French or Chinese reader met a page in neither. They
            are placeholders either way — the translation carries the same
            text, it does not make it legal advice. */}
        {doc === "imprint" ? <p>{t.footer.legalImprintBody}</p> : null}
        {doc === "privacy" ? <p>{t.footer.legalPrivacyBody}</p> : null}
        {doc === "terms" ? <p>{t.footer.legalTermsBody}</p> : null}

        <p className="flex items-start gap-2.5 rounded-sm border border-gold/45 bg-gold-wash px-4 py-3 text-sm text-fg">
          <IconAlert size={17} className="mt-0.5 shrink-0 text-bronze" />
          <span>{t.footer.legalNotice}</span>
        </p>
      </div>
    </div>
  );
}
