import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ToyForm } from "@/components/admin/toy-form";
import { IconArrowLeft } from "@/components/icons";
import { COMPANY } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewToyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  // The layout redirects signed-out visitors, but a page renders in parallel
  // with its layout, so it has to guard for itself.
  if (!user) redirect(localePath(locale, "/login"));
  if (!can(user.role, "vehicle.create")) redirect(localePath(locale, "/admin/toys"));

  const advisors = await prisma.user.findMany({
    where: { active: true, role: { in: ["ADMIN", "MANAGER", "SALES"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  // Arriving from a family tab pre-selects that family, so the form opens on
  // the fields the operator was already thinking about.
  const KINDS = ["MOTORCYCLE", "QUAD", "JETSKI", "BOAT"];
  const requested = (await searchParams).kind;
  const kind = requested && KINDS.includes(requested) ? requested : "MOTORCYCLE";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={localePath(locale, "/admin/toys")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
        >
          <IconArrowLeft size={15} />
          {t.admin.toys}
        </Link>
        <h1 className="mt-2 display text-3xl">{t.admin.newToy}</h1>
      </div>

      <ToyForm
        locale={locale}
        advisors={advisors}
        values={{
          kind,
          location: `${COMPANY.postalCode} ${COMPANY.city}`,
          accidentFree: true,
          registered: true,
          status: "AVAILABLE",
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
