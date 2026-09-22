import Link from "next/link";
import { Logo } from "./logo";
import { IconPin, IconPhone, IconMail, IconClock } from "./icons";
import { getDictionary, localePath, type Locale } from "@/i18n";
import type { Company } from "@/lib/company";

export function SiteFooter({ locale, company }: { locale: Locale; company: Company }) {
  const t = getDictionary(locale);
  const year = new Date().getFullYear();

  const explore = [
    { href: "/vehicles", label: t.nav.vehicles },
    { href: "/rental", label: t.nav.rental },
    { href: "/big-toys", label: t.nav.bigToys },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];

  const legal = [
    { href: "/legal/imprint", label: t.footer.imprint },
    { href: "/legal/privacy", label: t.footer.privacy },
    { href: "/legal/terms", label: t.footer.terms },
  ];

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo size="md" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t.footer.tagline}</p>
          <div className="flag-rule w-24 opacity-80" />
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="mb-4 text-xs font-semibold uppercase tracking-[0.16em]">
            {t.footer.explore}
          </h2>
          <ul className="space-y-2.5">
            {explore.map((item) => (
              <li key={item.href}>
                <Link
                  href={localePath(locale, item.href)}
                  className="cursor-pointer text-sm text-muted transition-colors duration-200 hover:text-red"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="mb-4 text-xs font-semibold uppercase tracking-[0.16em]">
            {t.footer.legal}
          </h2>
          <ul className="space-y-2.5">
            {legal.map((item) => (
              <li key={item.href}>
                <Link
                  href={localePath(locale, item.href)}
                  className="cursor-pointer text-sm text-muted transition-colors duration-200 hover:text-red"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em]">
            {t.footer.contactTitle}
          </h2>
          <address className="space-y-3 text-sm not-italic text-muted">
            <p className="flex items-start gap-2.5">
              <IconPin size={16} className="mt-0.5 shrink-0 text-red" />
              <span>
                {company.legalName}
                <br />
                {company.street}
                <br />
                {company.postalCode} {company.city}
              </span>
            </p>
            <p className="flex items-center gap-2.5">
              <IconPhone size={16} className="shrink-0 text-red" />
              <a
                href={`tel:${company.phone.replace(/\s/g, "")}`}
                className="cursor-pointer tabular-nums transition-colors duration-200 hover:text-fg"
              >
                {company.phone}
              </a>
            </p>
            <p className="flex items-center gap-2.5">
              <IconMail size={16} className="shrink-0 text-red" />
              <a
                href={`mailto:${company.email}`}
                className="cursor-pointer break-all transition-colors duration-200 hover:text-fg"
              >
                {company.email}
              </a>
            </p>
            <p className="flex items-start gap-2.5">
              <IconClock size={16} className="mt-0.5 shrink-0 text-red" />
              <span>
                {t.contact.weekdays} 09:00 – 18:30
                <br />
                {t.contact.saturday} 10:00 – 16:00
              </span>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-subtle sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {year} {company.legalName}. {t.footer.rights}
          </p>
          <p className="tabular-nums">
            {company.street} · {company.postalCode} {company.city} · {company.country}
          </p>
        </div>
      </div>
    </footer>
  );
}
