import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { fontVariables } from "./fonts";
import { ThemeScript } from "@/components/theme-toggle";
import { NotFoundView } from "@/components/not-found-view";
import { LOCALE_META, resolveLocale } from "@/i18n";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `404 · ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

/**
 * An address that matches no page at all — a typo, or a link from elsewhere
 * to something that never existed.
 *
 * It answers before any layout of the site is reached, so it is a document of
 * its own; that is also why it can carry a real 404 status, which tells
 * search engines to drop the address. The language is taken from the path,
 * which the middleware passes along.
 */
export default async function GlobalNotFound() {
  const segment = (await headers()).get("x-pathname")?.split("/")[1];
  const locale = resolveLocale(segment);
  const meta = LOCALE_META[locale];
  return (
    <html lang={meta.htmlLang} dir={meta.dir} className={fontVariables}>
      <head>
        <ThemeScript />
      </head>
      <body>
        <NotFoundView locale={locale} />
      </body>
    </html>
  );
}
