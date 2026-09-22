import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ToyForm, type ToyFormValues } from "@/components/admin/toy-form";
import { toyValuesFromPayload } from "@/lib/toy-templates";
import { IconArrowLeft, IconLayers } from "@/components/icons";
import { COMPANY } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KINDS = ["MOTORCYCLE", "QUAD", "JETSKI", "BOAT"];

export default async function NewToyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string; template?: string }>;
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

  // Most-used first, then most-recently used: the one someone reaches for
  // should not need searching.
  const templates = await prisma.toyTemplate.findMany({
    orderBy: [{ usageCount: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, name: true, kind: true, brand: true, model: true, version: true,
      usageCount: true, createdById: true,
      createdBy: { select: { name: true } },
    },
  });

  const sp = await searchParams;

  // Starting from a template fills the form server-side, so the values arrive
  // as ordinary defaults and every part of the form — including the sections
  // React drives from state, such as the family — picks them up with nothing
  // left to apply afterwards.
  const chosen = sp.template;
  let templateValues: ToyFormValues = {};
  let appliedTemplate: string | null = null;

  if (chosen) {
    const template = await prisma.toyTemplate.findUnique({ where: { id: chosen } });
    if (template) {
      templateValues = toyValuesFromPayload(template.payload);
      appliedTemplate = template.name;
      await prisma.toyTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    }
  }

  // Arriving from a family tab pre-selects that family, so the form opens on
  // the fields the operator was already thinking about. A template outranks
  // it: whoever picked one has already said what they are entering.
  const kind = sp.kind && KINDS.includes(sp.kind) ? sp.kind : "MOTORCYCLE";

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

      {appliedTemplate ? (
        <p className="flex items-center gap-2 rounded-sm border border-ok/40 bg-ok/10 px-3 py-2 text-sm">
          <IconLayers size={15} className="shrink-0 text-ok" />
          <span>
            <strong>{appliedTemplate}</strong> — {t.admin.templateApplied}
          </span>
        </p>
      ) : null}

      <ToyForm
        // Choosing a template navigates within this same route, so React would
        // reconcile the existing form rather than build a new one — and an
        // uncontrolled field already on screen ignores a changed defaultValue,
        // which would leave the dropdowns showing the previous machine. Keying
        // on the template forces a fresh form whose defaults all apply.
        key={chosen ?? "blank"}
        locale={locale}
        advisors={advisors}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          kind: template.kind,
          brand: template.brand,
          model: template.model,
          version: template.version,
          usageCount: template.usageCount,
          authorName: template.createdBy?.name ?? null,
          deletable: template.createdById === user.id || can(user.role, "vehicle.update.any"),
        }))}
        values={{
          kind,
          location: `${COMPANY.postalCode} ${COMPANY.city}`,
          accidentFree: true,
          registered: true,
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
