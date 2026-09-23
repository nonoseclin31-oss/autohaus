"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Logo } from "../logo";
import { ThemeToggle } from "../theme-toggle";
import { LanguageSwitcher } from "../language-switcher";
import { signOut } from "@/app/actions/auth";
import { localePath, type Locale } from "@/i18n";
import {
  IconDashboard, IconCar, IconInbox, IconUsers, IconActivity, IconSettings,
  IconLogout, IconMenu, IconArrowLeft, IconUser, IconCompass,
} from "../icons";
import { cn } from "@/lib/utils";

type NavEntry = {
  href: string;
  label: string;
  Icon: typeof IconCar;
  exact: boolean;
  show: boolean;
  /** Big Toys wears champagne here, as it does on its own pages. */
  accent?: boolean;
};

type Labels = {
  backOffice: string; dashboard: string; vehicles: string; toys: string; leads: string;
  users: string; activity: string; settings: string; profile: string; viewSite: string; logout: string;
  language: string; menu: string; close: string;
  catalogues: string; administration: string; enquiries: string;
  /** Short forms for the phone tab bar, where five labels share 375px. */
  dockHome: string; dockLeads: string; dockMore: string;
  newLeads: string;
};

export function AdminShell({
  children,
  locale,
  user,
  labels,
  permissions,
  newLeads,
}: {
  children: React.ReactNode;
  locale: Locale;
  user: {
    id: string; name: string; email: string; role: string;
    jobTitle: string | null; avatarUrl: string | null;
  };
  labels: Labels;
  permissions: { users: boolean; activity: boolean; settings: boolean };
  /** Enquiries nobody has picked up yet — the one number worth a badge. */
  newLeads: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // The drawer is a modal on a phone: Escape closes it, and the page behind
  // it must not scroll away underneath.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /**
   * The back office in four labelled groups.
   *
   * Cars and Big Toys are two entries under one "Catalogues" heading, which
   * is the whole point of the arrangement: they are visibly two modules
   * sharing one interface, rather than one list with a hidden filter. The
   * Big Toys entry carries the champagne accent its own universe uses, so
   * it is recognisable before the label is read.
   */
  const groups: { heading: string | null; items: NavEntry[] }[] = [
    {
      heading: null,
      items: [
        { href: "/admin", label: labels.dashboard, Icon: IconDashboard, exact: true, show: true },
      ],
    },
    {
      heading: labels.catalogues,
      items: [
        { href: "/admin/vehicles", label: labels.vehicles, Icon: IconCar, exact: false, show: true },
        { href: "/admin/toys", label: labels.toys, Icon: IconCompass, exact: false, show: true, accent: true },
      ],
    },
    {
      heading: labels.enquiries,
      items: [
        { href: "/admin/leads", label: labels.leads, Icon: IconInbox, exact: false, show: true },
      ],
    },
    {
      heading: labels.administration,
      items: [
        { href: "/admin/users", label: labels.users, Icon: IconUsers, exact: false, show: permissions.users },
        { href: "/admin/activity", label: labels.activity, Icon: IconActivity, exact: false, show: permissions.activity },
        { href: "/admin/settings", label: labels.settings, Icon: IconSettings, exact: false, show: permissions.settings },
      ],
    },
  ]
    .map((group) => ({ ...group, items: group.items.filter((item) => item.show) }))
    // A role with none of a group's pages must not be shown its heading.
    .filter((group) => group.items.length);

  function isActive(href: string, exact: boolean) {
    const full = localePath(locale, href);
    return exact ? pathname === full : pathname.startsWith(full);
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-5">
        <Link href={localePath(locale, "/admin")} className="cursor-pointer">
          <Logo size="sm" />
        </Link>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">
          {labels.backOffice}
        </p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label={labels.backOffice}>
        {groups.map((group, index) => (
          <div key={group.heading ?? `group-${index}`} className="space-y-1">
            {group.heading ? (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                {group.heading}
              </p>
            ) : null}
            {group.items.map(({ href, label: navLabel, Icon, exact, accent }) => {
              const active = isActive(href, exact);
              const badge = href === "/admin/leads" && newLeads > 0 ? newLeads : 0;
              return (
                <Link
                  key={href}
                  href={localePath(locale, href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
                    active
                      ? cn("bg-surface-2 text-fg border-s-2", accent ? "border-bronze" : "border-red")
                      : "border-s-2 border-transparent text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <Icon size={18} className={cn(active && (accent ? "text-bronze" : "text-red"))} />
                  {navLabel}
                  {badge ? (
                    <span
                      className="ms-auto rounded-full bg-red px-2 py-0.5 text-[11px] font-bold tabular-nums text-white"
                      title={labels.newLeads.replace("{n}", String(badge))}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-line p-4">
        <Link
          href={localePath(locale, "/admin/profile")}
          aria-current={isActive("/admin/profile", false) ? "page" : undefined}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-[3px] border p-2.5 transition-colors duration-200",
            isActive("/admin/profile", false)
              ? "border-red/40 bg-red-wash"
              : "border-line bg-surface-2 hover:border-line-strong",
          )}
        >
          <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-muted">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt="" fill sizes="36px" className="object-cover" />
            ) : (
              <IconUser size={17} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
            <p className="truncate text-xs text-subtle">{labels.profile}</p>
          </div>
        </Link>

        <Link href={localePath(locale)} className="btn btn-solid btn-sm w-full cursor-pointer">
          <IconArrowLeft size={14} />
          {labels.viewSite}
        </Link>

        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn btn-ghost btn-sm w-full cursor-pointer">
            <IconLogout size={14} />
            {labels.logout}
          </button>
        </form>
      </div>
    </div>
  );

  /* The phone tab bar: the four places a salesperson goes all day, one
     tap each, within reach of the thumb — and "More" for the rest, which
     opens the same menu as the desktop sidebar. */
  const dock = [
    { href: "/admin", label: labels.dockHome, Icon: IconDashboard, exact: true, accent: false, badge: 0 },
    { href: "/admin/vehicles", label: labels.vehicles, Icon: IconCar, exact: false, accent: false, badge: 0 },
    { href: "/admin/toys", label: labels.toys, Icon: IconCompass, exact: false, accent: true, badge: 0 },
    { href: "/admin/leads", label: labels.dockLeads, Icon: IconInbox, exact: false, accent: false, badge: newLeads },
  ];
  const moreActive = !dock.some((item) => isActive(item.href, item.exact));

  return (
    // --admin-dock is the height the phone tab bar takes at the foot of the
    // screen, home indicator included. Sticky save bars sit on top of it,
    // and the page leaves room for it, so nothing ends up underneath.
    <div data-admin-shell className="flex min-h-screen bg-canvas [--admin-dock:calc(4rem+env(safe-area-inset-bottom))] lg:[--admin-dock:0px]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-e border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={labels.menu}>
          <button
            type="button" aria-label={labels.close} onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-ink/35 backdrop-blur-sm animate-fade"
          />
          <div className="absolute inset-y-0 start-0 w-[min(18rem,85vw)] border-e border-line bg-surface pb-[env(safe-area-inset-bottom)] animate-rise">
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-xl sm:px-6">
          {/* On a phone the menu lives in the tab bar ("More"), within
              reach of the thumb; the header keeps the brand instead. */}
          <Link href={localePath(locale, "/admin")} className="me-auto cursor-pointer lg:hidden" aria-label={labels.dashboard}>
            <Logo size="sm" />
          </Link>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-subtle lg:block">
            {labels.backOffice}
          </span>
          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle locale={locale} />
            <LanguageSwitcher locale={locale} label={labels.language} compact />
          </div>
        </header>

        <main className="flex-1 p-4 pb-[calc(var(--admin-dock)+1.5rem)] sm:p-6 sm:pb-[calc(var(--admin-dock)+1.5rem)] lg:p-8">
          {children}
        </main>
      </div>

      {/* Phone and tablet tab bar */}
      <nav
        aria-label={labels.backOffice}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
          {dock.map(({ href, label: dockLabel, Icon, exact, accent, badge }) => {
            const active = isActive(href, exact);
            return (
              <li key={href}>
                <Link
                  href={localePath(locale, href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-full cursor-pointer flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold leading-none transition-colors duration-200",
                    active ? (accent ? "text-bronze" : "text-red") : "text-muted hover:text-fg",
                  )}
                >
                  {/* The active tab is marked by a bar as well as a colour. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-4 top-0 h-0.5 rounded-full transition-opacity duration-200",
                      accent ? "bg-bronze" : "bg-red",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="relative">
                    <Icon size={21} />
                    {badge ? (
                      <span className="absolute -end-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-surface">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="max-w-full truncate">{dockLabel}</span>
                  {badge ? <span className="sr-only">{labels.newLeads.replace("{n}", String(badge))}</span> : null}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              className={cn(
                "relative flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold leading-none transition-colors duration-200",
                moreActive ? "text-red" : "text-muted hover:text-fg",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("absolute inset-x-4 top-0 h-0.5 rounded-full bg-red transition-opacity duration-200", moreActive ? "opacity-100" : "opacity-0")}
              />
              <IconMenu size={21} />
              <span className="max-w-full truncate">{labels.dockMore}</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
