import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Back office",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));
  if (!can(user.role, "admin.access")) redirect(localePath(locale));

  return (
    <AdminShell
      locale={locale}
      user={user}
      labels={{
        backOffice: t.admin.backOffice,
        dashboard: t.admin.dashboard,
        vehicles: t.admin.vehicles,
        leads: t.admin.leads,
        users: t.admin.users,
        activity: t.admin.activity,
        settings: t.admin.settings,
        profile: t.admin.profile,
        viewSite: t.admin.viewSite,
        logout: t.nav.logout,
        language: t.common.language,
        menu: t.nav.menu,
        close: t.common.close,
      }}
      permissions={{
        users: can(user.role, "user.read"),
        activity: can(user.role, "activity.read"),
        settings: can(user.role, "settings.manage"),
      }}
    >
      {children}
    </AdminShell>
  );
}
