"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { IconMenu, IconX, IconPhone, IconUser } from "./icons";
import { localePath, type Locale } from "@/i18n";
import { cn, COMPANY } from "@/lib/utils";

type NavItem = { href: string; label: string };

export function SiteHeader({
  locale,
  nav,
  languageLabel,
}: {
  locale: Locale;
  nav: { items: NavItem[]; login: string; admin: string; menu: string };
  languageLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function isActive(href: string) {
    const full = localePath(locale, href);
    return href === "/" ? pathname === full : pathname.startsWith(full);
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "border-line bg-white/85 shadow-[0_2px_6px_-1px_rgba(12,10,9,0.07)] backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href={localePath(locale)}
            className="shrink-0 cursor-pointer transition-opacity duration-200 hover:opacity-85"
            aria-label={COMPANY.shortName}
          >
            <Logo heightClass="h-[22px] sm:h-7 lg:h-8" priority />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {nav.items.map((item) => (
              <Link
                key={item.href}
                href={localePath(locale, item.href)}
                className={cn(
                  // whitespace-nowrap: German and Spanish nav labels wrap to a
                  // second line inside the header without it.
                  "cursor-pointer whitespace-nowrap rounded-sm px-2.5 py-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-200",
                  isActive(item.href) ? "text-red" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
              className="hidden cursor-pointer items-center gap-2 whitespace-nowrap rounded-sm px-2.5 py-2 text-sm font-semibold text-muted transition-colors duration-200 hover:text-fg 2xl:inline-flex"
            >
              <IconPhone size={16} />
              <span className="tabular-nums">{COMPANY.phone}</span>
            </a>

            <LanguageSwitcher locale={locale} label={languageLabel} />

            <Link
              href={localePath(locale, "/login")}
              className="btn btn-ghost btn-sm hidden cursor-pointer sm:inline-flex"
            >
              <IconUser size={15} />
              {nav.login}
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={nav.menu}
              aria-expanded={open}
              className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-line p-2.5 text-fg transition-colors duration-200 hover:border-line-strong lg:hidden"
            >
              <IconMenu size={20} />
            </button>
          </div>
        </div>
        <div className="flag-rule opacity-70" />
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-ink/35 backdrop-blur-sm animate-fade"
          />
          <div className="absolute inset-y-0 end-0 flex w-[min(20rem,88vw)] flex-col border-s border-line bg-surface shadow-[var(--shadow-lg)] animate-rise">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="cursor-pointer rounded-sm p-2 text-muted transition-colors duration-200 hover:text-fg"
              >
                <IconX size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile">
              {nav.items.map((item) => (
                <Link
                  key={item.href}
                  href={localePath(locale, item.href)}
                  className={cn(
                    "block cursor-pointer rounded-sm px-3 py-3.5 text-base font-semibold uppercase tracking-[0.06em] transition-colors duration-200",
                    isActive(item.href) ? "bg-red-wash text-red" : "text-fg hover:bg-surface-2",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="space-y-3 border-t border-line px-5 py-5">
              <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="btn btn-solid w-full cursor-pointer">
                <IconPhone size={16} />
                {COMPANY.phone}
              </a>
              <Link href={localePath(locale, "/login")} className="btn btn-primary w-full cursor-pointer">
                <IconUser size={16} />
                {nav.login}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
