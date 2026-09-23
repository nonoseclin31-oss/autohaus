import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/theme-toggle";
import { notFound } from "next/navigation";
import "../globals.css";
import { fontVariables } from "../fonts";
import { LOCALES, LOCALE_META, getDictionary, isLocale, resolveLocale, type Locale } from "@/i18n";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import { COMPANY } from "@/lib/utils";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return {
    // Makes every canonical, hreflang and Open Graph URL absolute. Without it
    // link previews and search engines see relative paths and guess.
    metadataBase: new URL(COMPANY.siteUrl),
    applicationName: SITE_NAME,
    // Large photo previews in results and Discover: a car is sold on its
    // pictures, and the default is a thumbnail.
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    // The home page's own tags. Every page below restates its own, and the
    // template gives each of their titles the brand.
    ...pageMetadata({ locale, path: "", title: t.meta.title, description: t.meta.description, absoluteTitle: true }),
    title: { default: t.meta.title, template: `%s · ${SITE_NAME}` },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const meta = LOCALE_META[locale as Locale];

  return (
    <html lang={meta.htmlLang} dir={meta.dir} className={fontVariables}>
      <head>
        {/* Applies the saved theme before the first paint. An effect would
            run after it, and the light theme would flash on every load. */}
        <ThemeScript />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[80] focus:rounded-sm focus:bg-red focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          {getDictionary(locale).common.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
