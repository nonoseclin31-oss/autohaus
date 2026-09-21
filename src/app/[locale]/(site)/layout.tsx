import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SplashScreen } from "@/components/splash-screen";
import { getDictionary, resolveLocale } from "@/i18n";

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

  return (
    <div className="flex min-h-screen flex-col">
      <SplashScreen />
      <SiteHeader
        locale={locale}
        languageLabel={t.common.language}
        nav={{
          items: [
            { href: "/", label: t.nav.home },
            { href: "/vehicles", label: t.nav.vehicles },
            { href: "/rental", label: t.nav.rental },
            { href: "/about", label: t.nav.about },
            { href: "/contact", label: t.nav.contact },
          ],
          login: t.nav.login,
          admin: t.nav.admin,
          menu: t.nav.menu,
        }}
      />
      {/* tabIndex={-1} so the skip link can move the keyboard here, not just
          scroll the page — without it the next Tab goes back to the nav. */}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
