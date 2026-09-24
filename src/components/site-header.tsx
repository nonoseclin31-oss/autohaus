"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { IconMenu, IconX, IconPhone, IconUser, IconCompass } from "./icons";
import { useUniverseGate, UniverseGate } from "./universe-gate";
import { localePath, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

/** `universe` marks the doorway into Big Toys — the one link that wipes. */
type NavItem = { href: string; label: string; universe?: boolean };

export function SiteHeader({
  locale,
  nav,
  languageLabel,
  // Resolved by the layout so a number changed in the back office shows here
  // without a deploy.
  phone,
  shortName,
}: {
  locale: Locale;
  nav: { items: NavItem[]; login: string; admin: string; menu: string; crossing: string; main: string; close: string };
  languageLabel: string;
  /** Null when the back office has taken the number out of the header. */
  phone: string | null;
  shortName: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const gate = useUniverseGate();

  // Big Toys redefines every colour token, and a light header sitting on a
  // marine page would read as a rendering fault. The header carries the
  // scope itself rather than waiting for the layout below it.
  const inToys = pathname.startsWith(localePath(locale, "/big-toys"));
  const toysLabel = nav.items.find((item) => item.universe)?.label ?? "Big Toys";

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
      <UniverseGate phase={gate.phase} word={toysLabel} label={nav.crossing} />

      <header
        data-universe={inToys ? "toys" : undefined}
        className={cn(
          "sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "border-line bg-surface/85 shadow-[var(--shadow-sm)] backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        {/* The row is as wide as the page below it. With the phone number in
            it, six French or Spanish links, the language, the theme and the
            sign-in need more than that on the widest screens — the row then
            widens rather than pushing its end off the screen. */}
        <div
          className={cn(
            "mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8",
            phone && "2xl:max-w-[96rem]",
          )}
        >
          <Link
            href={localePath(locale)}
            className="shrink-0 cursor-pointer transition-opacity duration-200 hover:opacity-85"
            aria-label={shortName}
          >
            {/* A touch smaller while the full menu shares a row capped at the
                page width (1280–1535px); full size again above. */}
            <Logo heightClass="h-[22px] sm:h-7 lg:h-8 xl:h-7 2xl:h-8" priority />
          </Link>

          {/* From 1280px. Below that the six links do not fit beside the logo
              in French, German or Spanish, and the overflow let the whole page
              slide sideways — the menu button takes over instead. */}
          <nav className="hidden items-center gap-0.5 xl:flex 2xl:gap-1" aria-label={nav.main}>
            {nav.items.map((item) => (
              <Link
                key={item.href}
                href={localePath(locale, item.href)}
                onClick={item.universe ? gate.onLinkClick(localePath(locale, item.href)) : undefined}
                className={cn(
                  // whitespace-nowrap: German and Spanish nav labels wrap to a
                  // second line inside the header without it.
                  // A little tighter below 1536px, where the row is capped at the
                  // page width and Spanish needs every pixel of it.
                  "cursor-pointer whitespace-nowrap rounded-sm px-2 py-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-200 2xl:px-2.5",
                  item.universe
                    // The doorway is marked by one small champagne compass and
                    // nothing else. A framed chip said "different" loudly
                    // enough to look like a button among links; the icon says
                    // it quietly, and the label keeps the nav's own rhythm.
                    ? cn(
                        "inline-flex items-center gap-1.5",
                        isActive(item.href) ? "text-bronze" : "text-muted hover:text-bronze",
                      )
                    : isActive(item.href) ? "text-red" : "text-muted hover:text-fg",
                )}
              >
                {item.universe ? <IconCompass size={14} className="shrink-0 text-bronze" /> : null}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* A step tighter on a phone: at 360px the logo, theme, language and
              menu button otherwise overran the row by a few pixels. */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="hidden cursor-pointer items-center gap-2 whitespace-nowrap rounded-sm px-2.5 py-2 text-sm font-semibold text-muted transition-colors duration-200 hover:text-fg 2xl:inline-flex"
              >
                <IconPhone size={16} />
                <span className="tabular-nums">{phone}</span>
              </a>
            ) : null}

            <ThemeToggle locale={locale} />
            <LanguageSwitcher locale={locale} label={languageLabel} />

            <Link
              href={localePath(locale, "/login")}
              className="btn btn-ghost btn-sm hidden shrink-0 cursor-pointer whitespace-nowrap sm:inline-flex"
            >
              <IconUser size={15} />
              {nav.login}
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={nav.menu}
              aria-expanded={open}
              className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-line p-2.5 text-fg transition-colors duration-200 hover:border-line-strong xl:hidden"
            >
              <IconMenu size={20} />
            </button>
          </div>
        </div>
        <div className="flag-rule opacity-70" />
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label={nav.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-ink/35 backdrop-blur-sm animate-fade"
          />
          <div className="absolute inset-y-0 end-0 flex w-[min(20rem,88vw)] flex-col border-s border-line bg-surface shadow-[var(--shadow-lg)] animate-rise">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={nav.close}
                className="cursor-pointer rounded-sm p-2 text-muted transition-colors duration-200 hover:text-fg"
              >
                <IconX size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={nav.menu}>
              {nav.items.map((item) => (
                <Link
                  key={item.href}
                  href={localePath(locale, item.href)}
                  onClick={item.universe ? gate.onLinkClick(localePath(locale, item.href)) : undefined}
                  className={cn(
                    "cursor-pointer rounded-sm px-3 py-3.5 text-base font-semibold uppercase tracking-[0.06em] transition-colors duration-200",
                    item.universe ? "flex items-center gap-2.5" : "block",
                    item.universe
                      ? isActive(item.href) ? "bg-gold-wash text-bronze" : "text-fg hover:bg-surface-2"
                      : isActive(item.href) ? "bg-red-wash text-red" : "text-fg hover:bg-surface-2",
                  )}
                >
                  {item.universe ? <IconCompass size={17} className="shrink-0 text-bronze" /> : null}
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="space-y-3 border-t border-line px-5 py-5">
              {phone ? (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="btn btn-solid w-full cursor-pointer">
                  <IconPhone size={16} />
                  {phone}
                </a>
              ) : null}
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
