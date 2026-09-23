import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SplashScreen } from "@/components/splash-screen";
import { getDictionary, resolveLocale } from "@/i18n";
import { getCompany } from "@/lib/company";
import { getSiteSettings } from "@/lib/site-settings";
import { inToysUniverse } from "@/lib/route";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = getDictionary(locale);
  // One query for the whole tree; the header and footer both need it.
  const [company, site] = await Promise.all([getCompany(), getSiteSettings()]);

  // Which universe the document opened in. The layout renders once per page
  // load and is kept across client navigations, so this is the path the
  // visitor arrived on — exactly what decides whose first-paint splash plays.
  const openedInToys = await inToysUniverse();

  return (
    <div className="flex min-h-screen flex-col">
      <SplashScreen suppressed={openedInToys} />
      <SiteHeader
        locale={locale}
        languageLabel={t.common.language}
        // Switched off in the back office, the header shows no number at all;
        // the footer and the contact page keep it.
        phone={site.headerPhone ? company.phone : null}
        shortName={company.shortName}
        nav={{
          items: [
            { href: "/", label: t.nav.home },
            { href: "/vehicles", label: t.nav.vehicles },
            { href: "/rental", label: t.nav.rental },
            // Between the rental page and About, and the only item that
            // leads out of the dealership's own universe.
            { href: "/big-toys", label: t.nav.bigToys, universe: true },
            { href: "/about", label: t.nav.about },
            { href: "/contact", label: t.nav.contact },
          ],
          login: t.nav.login,
          admin: t.nav.admin,
          menu: t.nav.menu,
          crossing: t.toys.enterUniverse,
          main: t.nav.mainNav,
          close: t.nav.closeMenu,
        }}
      />
      {/* tabIndex={-1} so the skip link can move the keyboard here, not just
          scroll the page — without it the next Tab goes back to the nav. */}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter locale={locale} company={company} />
    </div>
  );
}
