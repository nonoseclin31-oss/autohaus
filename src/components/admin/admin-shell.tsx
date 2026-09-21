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
  IconLogout, IconMenu, IconArrowLeft, IconUser,
} from "../icons";
import { cn } from "@/lib/utils";

type Labels = {
  backOffice: string; dashboard: string; vehicles: string; leads: string;
  users: string; activity: string; settings: string; profile: string; viewSite: string; logout: string;
  language: string; menu: string; close: string;
};

export function AdminShell({
  children,
  locale,
  user,
  labels,
  permissions,
}: {
  children: React.ReactNode;
  locale: Locale;
  user: {
    id: string; name: string; email: string; role: string;
    jobTitle: string | null; avatarUrl: string | null;
  };
  labels: Labels;
  permissions: { users: boolean; activity: boolean; settings: boolean };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const nav = [
    { href: "/admin", label: labels.dashboard, Icon: IconDashboard, exact: true, show: true },
    { href: "/admin/vehicles", label: labels.vehicles, Icon: IconCar, exact: false, show: true },
    { href: "/admin/leads", label: labels.leads, Icon: IconInbox, exact: false, show: true },
    { href: "/admin/users", label: labels.users, Icon: IconUsers, exact: false, show: permissions.users },
    { href: "/admin/activity", label: labels.activity, Icon: IconActivity, exact: false, show: permissions.activity },
    { href: "/admin/settings", label: labels.settings, Icon: IconSettings, exact: false, show: permissions.settings },
  ].filter((item) => item.show);

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

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={labels.backOffice}>
        {nav.map(({ href, label: navLabel, Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={localePath(locale, href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
                active
                  ? "border-s-2 border-red bg-surface-2 text-fg"
                  : "border-s-2 border-transparent text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon size={18} className={active ? "text-red" : ""} />
              {navLabel}
            </Link>
          );
        })}
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

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-e border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button" aria-label={labels.close} onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-ink/35 backdrop-blur-sm animate-fade"
          />
          <div className="absolute inset-y-0 start-0 w-64 border-e border-line bg-surface animate-rise">
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={labels.menu}
            className="cursor-pointer rounded-sm border border-line p-2 text-fg transition-colors duration-200 hover:border-line-strong lg:hidden"
          >
            <IconMenu size={19} />
          </button>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-subtle lg:block">
            {labels.backOffice}
          </span>
          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle locale={locale} />
            <LanguageSwitcher locale={locale} label={labels.language} compact />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
