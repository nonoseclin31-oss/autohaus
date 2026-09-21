import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { VehicleForm, type VehicleFormValues } from "@/components/admin/vehicle-form";
import { TemplatePicker } from "@/components/admin/template-picker";
import { valuesFromPayload } from "@/lib/vehicle-templates";
import { IconArrowLeft, IconLayers } from "@/components/icons";
import { COMPANY } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  // The layout redirects signed-out visitors, but a page renders in
  // parallel with its layout, so it has to guard for itself.
  if (!user) redirect(localePath(locale, "/login"));

  if (!can(user.role, "vehicle.create")) redirect(localePath(locale, "/admin/vehicles"));

  const advisors = await prisma.user.findMany({
    where: { active: true, role: { in: ["ADMIN", "MANAGER", "SALES"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  // Most-used first, then most-recently used: with a few hundred of these the
  // ones someone reaches for should not need searching.
  const templates = await prisma.vehicleTemplate.findMany({
    orderBy: [{ usageCount: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, name: true, brand: true, model: true, version: true, usageCount: true,
      createdById: true,
      createdBy: { select: { name: true } },
    },
  });

  // Starting from a template fills the form server-side, so the values arrive
  // as ordinary defaults and every part of the form — including the sections
  // React drives from state — picks them up without anything to apply after.
  const chosen = (await searchParams).template;
  let templateValues: VehicleFormValues = {};
  let appliedTemplate: string | null = null;

  if (chosen) {
    const template = await prisma.vehicleTemplate.findUnique({ where: { id: chosen } });
    if (template) {
      templateValues = valuesFromPayload(template.payload);
      appliedTemplate = template.name;
      await prisma.vehicleTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={localePath(locale, "/admin/vehicles")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
        >
          <IconArrowLeft size={15} />
          {t.admin.vehicles}
        </Link>
        <h1 className="mt-2 display text-3xl">
          {t.admin.newVehicle}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TemplatePicker
          locale={locale}
          templates={templates.map((template) => ({
            id: template.id,
            name: template.name,
            brand: template.brand,
            model: template.model,
            version: template.version,
            usageCount: template.usageCount,
            authorName: template.createdBy?.name ?? null,
            deletable: template.createdById === user.id || can(user.role, "vehicle.update.any"),
          }))}
        />
        {appliedTemplate ? (
          <p className="flex items-center gap-2 rounded-sm border border-ok/40 bg-ok/10 px-3 py-2 text-sm">
            <IconLayers size={15} className="shrink-0 text-ok" />
            <span>
              <strong>{appliedTemplate}</strong> — {t.admin.templateApplied}
            </span>
          </p>
        ) : null}
      </div>

      <VehicleForm
        // Choosing a template navigates within this same route, so React would
        // reconcile the existing form rather than build a new one — and an
        // uncontrolled field already on screen ignores a changed defaultValue,
        // which left the dropdowns showing the previous car. Keying on the
        // template forces a fresh form whose defaults all apply.
        key={chosen ?? "blank"}
        locale={locale}
        advisors={advisors}
        values={{
          location: `${COMPANY.postalCode} ${COMPANY.city}`,
          accidentFree: true,
          nonSmoker: true,
          status: "AVAILABLE",
          // A template overrides the blank-form defaults where it has a value.
          ...templateValues,
          // But a new listing belongs to whoever is creating it.
          ownerId: user.id,
        }}
        permissions={{
          canPublish: can(user.role, "vehicle.publish"),
          canSetStatus: can(user.role, "vehicle.status"),
          canAssignOwner: can(user.role, "vehicle.update.any"),
        }}
      />
    </div>
  );
}
