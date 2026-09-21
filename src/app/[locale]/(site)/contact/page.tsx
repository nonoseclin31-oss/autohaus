import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { getDictionary, resolveLocale } from "@/i18n";
import { LeadForm } from "@/components/lead-form";
import { IconPin, IconPhone, IconMail, IconClock } from "@/components/icons";
import { COMPANY } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.contact.title, description: t.meta.contact,
    alternates: pageAlternates(locale, "/contact"),
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(COMPANY.mapsQuery)}&output=embed`;

  return (
    <>
      <section className="studio border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="eyebrow mb-4">
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            {t.nav.contact}
          </p>
          <h1 className="display text-[clamp(2.25rem,5.5vw,4rem)]">
            {t.contact.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{t.contact.subtitle}</p>
        </div>
        <div className="flag-rule" />
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:px-8">
        {/* Details */}
        <div className="space-y-6">
          <div className="rounded-sm border border-line bg-surface p-6">
            <h2 className="mb-5 text-lg font-semibold">{t.contact.findUs}</h2>
            <address className="space-y-4 not-italic">
              <div className="flex items-start gap-3">
                <IconPin size={19} className="mt-0.5 shrink-0 text-red" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-subtle">{t.contact.address}</p>
                  <p className="mt-0.5 font-semibold text-fg">{COMPANY.legalName}</p>
                  <p className="text-muted">{COMPANY.street}</p>
                  <p className="text-muted">
                    {COMPANY.postalCode} {COMPANY.city}
                  </p>
                  <p className="text-muted">{COMPANY.country}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconPhone size={19} className="mt-0.5 shrink-0 text-red" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-subtle">{t.contact.phone}</p>
                  <a
                    href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                    className="cursor-pointer font-semibold tabular-nums text-fg transition-colors duration-200 hover:text-red"
                  >
                    {COMPANY.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconMail size={19} className="mt-0.5 shrink-0 text-red" />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-subtle">{t.contact.email}</p>
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="cursor-pointer break-all font-semibold text-fg transition-colors duration-200 hover:text-red"
                  >
                    {COMPANY.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconClock size={19} className="mt-0.5 shrink-0 text-red" />
                <div className="w-full">
                  <p className="text-xs uppercase tracking-wider text-subtle">{t.contact.openingHours}</p>
                  <dl className="mt-1 space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">{t.contact.weekdays}</dt>
                      <dd className="font-semibold tabular-nums text-fg">09:00 – 18:30</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">{t.contact.saturday}</dt>
                      <dd className="font-semibold tabular-nums text-fg">10:00 – 16:00</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">{t.contact.sunday}</dt>
                      <dd className="font-semibold text-subtle">{t.contact.byAppointment}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </address>
          </div>

          <div className="overflow-hidden rounded-sm border border-line">
            <iframe
              src={mapSrc}
              title={`${COMPANY.legalName} — ${t.contact.findUs}`}
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block border-0 grayscale-[0.3]"
            />
          </div>
        </div>

        {/* Form */}
        <div className="rounded-sm border border-line bg-surface p-6 sm:p-8">
          <h2 className="mb-1 display text-2xl">
            {t.contact.writeUs}
          </h2>
          <p className="mb-6 text-muted">{t.detail.contactBody}</p>
          <LeadForm locale={locale} type="CONTACT" />
        </div>
      </div>
    </>
  );
}
