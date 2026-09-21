import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { SignInForm } from "@/components/sign-in-form";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { IconArrowLeft } from "@/components/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const t = getDictionary((await params).locale);
  return { title: t.auth.signIn, robots: { index: false, follow: false } };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (user) redirect(localePath(locale, "/admin"));

  return (
    <div className="studio flex min-h-screen flex-col">
      <div className="hairlines absolute inset-0 opacity-50" aria-hidden="true" />

      <header className="relative flex items-center justify-between px-4 py-5 sm:px-8">
        <Link href={localePath(locale)} className="cursor-pointer">
          <Logo size="md" priority />
        </Link>
        <LanguageSwitcher locale={locale} label={t.common.language} />
      </header>

      {/* Same id and tabIndex as the site layout's main: the skip link in the
          header points here, and without them it had nowhere to go. */}
      <main
        id="main"
        tabIndex={-1}
        className="relative flex flex-1 items-center justify-center px-4 py-10 outline-none"
      >
        <div className="w-full max-w-md">
          <div className="rounded-sm border border-line bg-surface p-7 shadow-[var(--shadow-lg)] sm:p-9">
            <h1 className="display text-3xl">{t.auth.signIn}</h1>
            <p className="mt-1.5 text-sm text-muted">{t.auth.signInSubtitle}</p>
            <div className="flag-rule mt-5 w-20" />

            <div className="mt-7">
              <SignInForm locale={locale} />
            </div>
          </div>

          <Link
            href={localePath(locale)}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 text-sm text-muted transition-colors duration-200 hover:text-fg"
          >
            <IconArrowLeft size={15} />
            {t.auth.backToSite}
          </Link>
        </div>
      </main>

      <div className="flag-rule relative" />
    </div>
  );
}
