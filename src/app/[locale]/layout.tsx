import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/theme-toggle";
import { notFound } from "next/navigation";
import { Inter, Playfair_Display, Barlow_Condensed } from "next/font/google";
import "../globals.css";
import { LOCALES, LOCALE_META, DEFAULT_LOCALE, getDictionary, isLocale, type Locale } from "@/i18n";
import { COMPANY } from "@/lib/utils";

/* Inter carries the interface and all data; Playfair gives the editorial
   display voice; Barlow Condensed carries the racing wordmark and, upright,
   the whole Big Toys universe. */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  // Italic for the racing wordmark, upright for the Big Toys display voice.
  style: ["normal", "italic"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

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
  const { locale } = await params;
  const t = getDictionary(locale);
  return {
    // Makes every canonical, hreflang and Open Graph URL absolute. Without it
    // link previews and search engines see relative paths and guess.
    metadataBase: new URL(COMPANY.siteUrl),
    title: { default: t.meta.title, template: `%s · Autohaus Motion` },
    description: t.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_META[l].htmlLang, `/${l}`])),
        "x-default": `/${DEFAULT_LOCALE}`,
      },
    },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      siteName: "Autohaus Motion",
      url: `/${locale}`,
      locale: LOCALE_META[locale as Locale]?.htmlLang,
      type: "website",
    },
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
    <html lang={meta.htmlLang} dir={meta.dir} className={`${inter.variable} ${playfair.variable} ${barlowCondensed.variable}`}>
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
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
