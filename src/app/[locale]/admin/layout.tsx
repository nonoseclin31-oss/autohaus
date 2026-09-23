import { redirect } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/admin-shell";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDictionary(resolveLocale((await params).locale));
  return { title: t.admin.backOffice, robots: { index: false, follow: false } };
}

// The back office draws its tab bar to the very foot of the screen and pads
// it by the home-indicator inset, which a browser only reports when the page
// asks to cover the whole display.
export const viewport: Viewport = { viewportFit: "cover" };

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

  // Enquiries nobody has picked up yet, for the badge on the Leads tab. Read
  // only by roles that can see enquiries at all.
  const newLeads = can(user.role, "lead.read")
    ? await prisma.lead.count({ where: { status: "NEW" } }).catch(() => 0)
    : 0;

  return (
    <AdminShell
      locale={locale}
      user={user}
      labels={{
        backOffice: t.admin.backOffice,
        dashboard: t.admin.dashboard,
        vehicles: t.admin.vehicles,
        toys: t.admin.toys,
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
        catalogues: t.admin.navCatalogues,
        administration: t.admin.navAdministration,
        enquiries: t.admin.navActivityGroup,
        dockHome: t.admin.dockHome,
        dockLeads: t.admin.dockLeads,
        dockMore: t.admin.dockMore,
        newLeads: t.admin.newLeadsBadge,
      }}
      newLeads={newLeads}
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
