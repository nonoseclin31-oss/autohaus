import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "fr", "de", "zh", "ar", "es"] as const;
// For a browser whose languages are none of the six: English reaches more of
// them than French. hreflang's x-default says the same (lib/seo.ts).
const FALLBACK_LOCALE = "en";

// The one address the site answers at. The same pages on www, or over plain
// http, are duplicates as far as a search engine is concerned, and split
// whatever standing the site earns between them.
const SITE = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://autohausmotion.com");

function pickLocale(request: NextRequest): string {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && (LOCALES as readonly string[]).includes(cookie)) return cookie;

  const header = request.headers.get("accept-language");
  if (header) {
    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, q] = part.trim().split(";q=");
        return { tag: tag.toLowerCase(), q: q ? Number.parseFloat(q) : 1 };
      })
      .sort((a, b) => b.q - a.q);

    for (const { tag } of ranked) {
      const base = tag.split("-")[0];
      if ((LOCALES as readonly string[]).includes(base)) return base;
    }
  }
  return FALLBACK_LOCALE;
}

/**
 * Where a request on the wrong host or scheme belongs, or null when it is
 * already right. Only the site's own name is corrected — a preview address or
 * localhost is left alone.
 *
 * Plain http is recognised only from what Cloudflare says the visitor used.
 * Guessing it from the URL the Worker rebuilds could mistake an https visit
 * for http and send it round in a loop.
 */
function canonicalOrigin(request: NextRequest): URL | null {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const onWww = host === `www.${SITE.host}`;
  if (!onWww && host !== SITE.host) return null;

  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const visitor = request.headers.get("cf-visitor") ?? "";
  const plainHttp = forwarded === "http" || /"scheme"\s*:\s*"http"/.test(visitor);
  if (!onWww && !plainHttp) return null;

  return new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, SITE.origin);
}

export function middleware(request: NextRequest) {
  // Permanent, so search engines move what they know to the right address.
  const moved = canonicalOrigin(request);
  if (moved) return NextResponse.redirect(moved, 308);

  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) {
    // A layout cannot ask which page is below it, and the site shell needs to
    // know: the first-load splash belongs to the dealership, and Big Toys
    // opens with its own. Passing the path along as a header is the only way
    // to decide that before the first paint rather than after it.
    const headers = new Headers(request.headers);
    headers.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers } });
  }

  const locale = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next internals, uploaded media and files with an extension.
  matcher: ["/((?!api|_next/static|_next/image|uploads|brand|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
