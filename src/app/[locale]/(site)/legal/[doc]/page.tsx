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

        {doc === "imprint" ? (
          <>
            <p>
              {COMPANY.legalName} — Handelsregister / Registergericht, USt-IdNr. und
              Geschäftsführung sind hier einzutragen.
            </p>
          </>
        ) : null}

        {doc === "privacy" ? (
          <p>
            Data submitted through the enquiry forms on this website (name, email address, phone number
            and message) is stored solely to process the enquiry and is shared only with the sales
            advisor handling it. It is never sold or passed to third parties for marketing.
          </p>
        ) : null}

        {doc === "terms" ? (
          <p>
            Vehicle listings, prices and availability shown on this website are indicative and do not
            constitute a binding offer. A sale or rental agreement is concluded only once a written
            contract has been signed by both parties.
          </p>
        ) : null}

        <p className="flex items-start gap-2.5 rounded-sm border border-gold/45 bg-gold-wash px-4 py-3 text-sm text-fg">
          <IconAlert size={17} className="mt-0.5 shrink-0 text-bronze" />
          <span>
            Placeholder text. This page must be completed and reviewed by legal counsel before the
            site goes live — German law (TMG §5, DSGVO) sets mandatory content for this page.
          </span>
        </p>
      </div>
    </div>
  );
}
