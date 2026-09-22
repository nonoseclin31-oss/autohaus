import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "fr", "de", "zh", "ar", "es"] as const;
const DEFAULT_LOCALE = "fr";

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
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
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
