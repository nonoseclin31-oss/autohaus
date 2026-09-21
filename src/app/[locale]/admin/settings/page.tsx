import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getCompany, getCompanyOverrides } from "@/lib/company";
import { CompanySettingsForm } from "@/components/admin/company-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  // The layout redirects signed-out visitors, but a page renders in parallel
  // with its layout, so it has to guard for itself.
  if (!user) redirect(localePath(locale, "/login"));
  if (!can(user.role, "settings.manage")) redirect(localePath(locale, "/admin"));

  const [company, overrides] = await Promise.all([getCompany(), getCompanyOverrides()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">{t.admin.settings}</h1>
        <p className="mt-1 text-sm text-muted">{t.admin.settingsBody}</p>
      </div>

      <CompanySettingsForm
        locale={locale}
        values={{
          email: overrides.email ?? company.email,
          phone: overrides.phone ?? company.phone,
          street: overrides.street ?? company.street,
          postalCode: overrides.postalCode ?? company.postalCode,
          city: overrides.city ?? company.city,
          country: overrides.country ?? company.country,
          registerCourt: overrides.registerCourt ?? company.registerCourt,
          registerNumber: overrides.registerNumber ?? company.registerNumber,
          managingDirector: overrides.managingDirector ?? company.managingDirector,
          vatId: overrides.vatId ?? company.vatId,
        }}
      />
    </div>
  );
}
