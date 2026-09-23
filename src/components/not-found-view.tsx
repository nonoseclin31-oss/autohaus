import Link from "next/link";
import { Logo } from "@/components/logo";
import { IconArrowRight } from "@/components/icons";
import { getDictionary, localePath, type Locale } from "@/i18n";

/** The 404 page's content, in one language. */
export function NotFoundView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <div className="studio flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo variant="full" size="md" priority />
      <p className="mt-10 display text-[clamp(4rem,16vw,9rem)] text-red">
        404
      </p>
      <p className="mt-2 max-w-md text-lg text-muted">
        {t.meta.notFound}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link href={localePath(locale, "/")} className="btn btn-primary cursor-pointer">
          {t.nav.home}
          <IconArrowRight size={17} />
        </Link>
        <Link href={localePath(locale, "/vehicles")} className="btn btn-ghost cursor-pointer">
          {t.nav.vehicles}
        </Link>
      </div>
    </div>
  );
}
