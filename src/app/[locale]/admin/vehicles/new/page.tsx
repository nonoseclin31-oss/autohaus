import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { IconArrowLeft } from "@/components/icons";
import { COMPANY } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage({ params }: { params: Promise<{ locale: string }> }) {
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

      <VehicleForm
        locale={locale}
        advisors={advisors}
        values={{
          ownerId: user.id,
          location: `${COMPANY.postalCode} ${COMPANY.city}`,
          accidentFree: true,
          nonSmoker: true,
          status: "AVAILABLE",
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
