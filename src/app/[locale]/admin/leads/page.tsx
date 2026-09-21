import Link from "next/link";
import { getDictionary, resolveLocale, localePath, formatDate, formatNumber } from "@/i18n";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { label, LEAD_TYPES, LEAD_STATUS, optionsFor, type Locale as TaxLocale } from "@/lib/taxonomy";
import { updateLead, deleteLead } from "@/app/actions/leads";
import { IconInbox, IconMail, IconPhone, IconTrash, IconCar, IconCheck } from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const locale = resolveLocale((await params).locale);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);
  const sp = await searchParams;
  const user = await getCurrentUser();
  // The layout redirects signed-out visitors, but a page renders in
  // parallel with its layout, so it has to guard for itself.
  if (!user) redirect(localePath(locale, "/login"));

  const statusFilter = typeof sp.status === "string" ? sp.status : "";
  const mine = sp.mine === "1";

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(mine ? { assignedToId: user.id } : {}),
  };

  const [leads, counts, advisors] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        vehicle: { select: { id: true, brand: true, model: true, slug: true, reference: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.findMany({
      where: { active: true, role: { in: ["ADMIN", "MANAGER", "SALES"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const countFor = (status: string) => counts.find((c) => c.status === status)?._count._all ?? 0;
  const editable = can(user.role, "lead.update");

  const tabs = [
    { value: "", label: t.common.all, count: counts.reduce((sum, c) => sum + c._count._all, 0) },
    ...["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].map((status) => ({
      value: status,
      label: label(LEAD_STATUS, status, tax),
      count: countFor(status),
    })),
  ];

  function hrefWith(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (mine) params.set("mine", "1");
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    return `${localePath(locale, "/admin/leads")}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">{t.admin.leads}</h1>
        <p className="mt-1 text-sm text-muted tabular-nums">
          {leads.length} {t.common.results}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const active = statusFilter === tab.value;
          return (
            <Link
              key={tab.value || "all"}
              href={hrefWith({ status: tab.value })}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
                active ? "bg-red text-white" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
              )}
            >
              {tab.label}
              <span className={cn("text-xs tabular-nums", active ? "text-white/80" : "text-subtle")}>{tab.count}</span>
            </Link>
          );
        })}
        <Link
          href={hrefWith({ mine: mine ? "" : "1" })}
          className={cn(
            "ms-auto inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
            mine ? "bg-gold text-ink" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
          )}
        >
          {t.admin.assignTo}: {t.admin.you}
        </Link>
      </div>

      {leads.length ? (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-sm border border-line bg-surface">
              <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
                {/* Contact + message */}
                <div className="min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">
                      {lead.firstName} {lead.lastName}
                    </h2>
                    <span
                      className={cn(
                        "chip",
                        lead.status === "NEW" && "border-gold/50 bg-gold-wash text-bronze",
                        lead.status === "WON" && "border-ok/40 bg-ok-wash text-ok",
                        lead.status === "LOST" && "border-line text-subtle",
                      )}
                    >
                      {label(LEAD_STATUS, lead.status, tax)}
                    </span>
                    <span className="chip">{label(LEAD_TYPES, lead.type, tax)}</span>
                    <span className="chip uppercase">{lead.locale}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-muted transition-colors duration-200 hover:text-fg"
                    >
                      <IconMail size={14} className="text-subtle" />
                      {lead.email}
                    </a>
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone.replace(/\s/g, "")}`}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-muted transition-colors duration-200 hover:text-fg"
                      >
                        <IconPhone size={14} className="text-subtle" />
                        <span className="tabular-nums">{lead.phone}</span>
                      </a>
                    ) : null}
                    {lead.company ? <span className="text-subtle">{lead.company}</span> : null}
                  </div>

                  {lead.vehicle ? (
                    <Link
                      href={localePath(locale, `/admin/vehicles/${lead.vehicle.id}`)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-surface-2 px-2.5 py-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
                    >
                      <IconCar size={14} className="text-red" />
                      {lead.vehicle.brand} {lead.vehicle.model}
                      <span className="font-mono text-xs text-subtle">{lead.vehicle.reference}</span>
                    </Link>
                  ) : null}

                  {lead.rentalDuration || lead.rentalMileage ? (
                    <p className="text-sm text-muted tabular-nums">
                      {lead.rentalDuration ? `${lead.rentalDuration} ${t.common.months}` : ""}
                      {lead.rentalDuration && lead.rentalMileage ? " · " : ""}
                      {lead.rentalMileage ? `${formatNumber(lead.rentalMileage, locale)} ${t.common.km}` : ""}
                    </p>
                  ) : null}

                  {lead.message ? (
                    <p className="whitespace-pre-line rounded-sm bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-muted">
                      {lead.message}
                    </p>
                  ) : null}

                  <p className="text-xs text-subtle tabular-nums">
                    {t.admin.receivedOn} {formatDate(lead.createdAt, locale, {
                      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Handling */}
                {editable ? (
                  <form action={updateLead} className="space-y-3 rounded-sm bg-surface-2 p-3.5">
                    <input type="hidden" name="id" value={lead.id} />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`status-${lead.id}`} className="label">{t.admin.leadStatus}</label>
                        <select id={`status-${lead.id}`} name="status" defaultValue={lead.status} className="select">
                          {optionsFor(LEAD_STATUS, tax).map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`assign-${lead.id}`} className="label">{t.admin.assignTo}</label>
                        <select
                          id={`assign-${lead.id}`} name="assignedToId"
                          defaultValue={lead.assignedToId ?? ""} className="select"
                        >
                          <option value="">{t.admin.unassigned}</option>
                          {advisors.map((advisor) => (
                            <option key={advisor.id} value={advisor.id}>{advisor.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`notes-${lead.id}`} className="label">{t.admin.internalNotes}</label>
                      <textarea
                        id={`notes-${lead.id}`} name="notes" rows={3} maxLength={2000}
                        defaultValue={lead.notes ?? ""} className="textarea"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      {can(user.role, "lead.delete") ? (
                        <button
                          type="submit"
                          formAction={deleteLead}
                          className="btn btn-danger btn-sm cursor-pointer"
                        >
                          <IconTrash size={14} />
                          {t.common.delete}
                        </button>
                      ) : null}
                      <button type="submit" className="btn btn-primary btn-sm cursor-pointer">
                        <IconCheck size={14} />
                        {t.common.save}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-sm bg-surface-2 p-3.5 text-sm text-subtle">
                    {t.admin.permDenied}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-line bg-surface px-6 py-20 text-center">
          <IconInbox size={44} className="text-subtle" />
          <p className="text-muted">{t.admin.noLeads}</p>
        </div>
      )}
    </div>
  );
}
