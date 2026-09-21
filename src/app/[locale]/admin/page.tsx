import Link from "next/link";
import { getDictionary, resolveLocale, localePath, formatCurrency, formatNumber, formatDate } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { label, LEAD_TYPES, LEAD_STATUS, type Locale as TaxLocale } from "@/lib/taxonomy";
import { StatusDot } from "@/components/status-vignette";
import {
  IconCar, IconCheckCircle, IconClock, IconFlag, IconInbox, IconTruck,
  IconEuro, IconEye, IconPlus, IconArrowRight, IconActivity,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Kpi({
  Icon, label: kpiLabel, value, tone = "default",
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "red" | "gold" | "ok";
}) {
  const toneClass = {
    default: "text-muted",
    red: "text-red",
    gold: "text-bronze",
    ok: "text-ok",
  }[tone];

  return (
    <div className="rounded-sm border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-subtle">
        <Icon size={15} className={toneClass} />
        <span className="line-clamp-1">{kpiLabel}</span>
      </div>
      <p className="mt-2 display text-3xl tabular-nums">{value}</p>
    </div>
  );
}

export default async function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);
  const user = await getCurrentUser();

  const [
    total, available, reserved, sold, rentalReady, openLeads, priceAgg, viewsAgg,
    recentLeads, recentVehicles, recentActivity,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { status: "RESERVED" } }),
    prisma.vehicle.count({ where: { status: "SOLD" } }),
    prisma.vehicle.count({ where: { rentalAvailable: true } }),
    prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED"] } } }),
    prisma.vehicle.aggregate({ where: { status: { not: "SOLD" } }, _sum: { price: true } }),
    prisma.vehicle.aggregate({ _sum: { views: true } }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { vehicle: { select: { brand: true, model: true, slug: true } } },
    }),
    prisma.vehicle.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, brand: true, model: true, reference: true, status: true, price: true, published: true, updatedAt: true },
    }),
    can(user?.role, "activity.read")
      ? prisma.activityLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">
            <span className="h-px w-6 bg-gold" aria-hidden="true" />
            {t.admin.dashboard}
          </p>
          <h1 className="display text-3xl sm:text-4xl">
            {t.admin.welcome}, {user?.name.split(" ")[0]}
          </h1>
        </div>
        {can(user?.role, "vehicle.create") ? (
          <Link href={localePath(locale, "/admin/vehicles/new")} className="btn btn-primary cursor-pointer">
            <IconPlus size={17} />
            {t.admin.addVehicle}
          </Link>
        ) : null}
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi Icon={IconCar} label={t.admin.kpiTotal} value={formatNumber(total, locale)} />
        <Kpi Icon={IconCheckCircle} label={t.admin.kpiAvailable} value={formatNumber(available, locale)} tone="ok" />
        <Kpi Icon={IconClock} label={t.admin.kpiReserved} value={formatNumber(reserved, locale)} tone="red" />
        <Kpi Icon={IconFlag} label={t.admin.kpiSold} value={formatNumber(sold, locale)} tone="red" />
        <Kpi Icon={IconInbox} label={t.admin.kpiLeads} value={formatNumber(openLeads, locale)} tone="gold" />
        <Kpi Icon={IconTruck} label={t.admin.kpiRental} value={formatNumber(rentalReady, locale)} />
        <Kpi Icon={IconEuro} label={t.admin.kpiValue} value={formatCurrency(priceAgg._sum.price ?? 0, locale)} />
        <Kpi Icon={IconEye} label={t.admin.kpiViews} value={formatNumber(viewsAgg._sum.views ?? 0, locale)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Latest leads */}
        <section className="rounded-sm border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em]">{t.admin.recentLeads}</h2>
            <Link
              href={localePath(locale, "/admin/leads")}
              className="link-underline cursor-pointer text-xs font-bold uppercase tracking-widest text-muted"
            >
              {t.cta.seeAll}
            </Link>
          </header>

          {recentLeads.length ? (
            <ul className="divide-y divide-[var(--color-line)]">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="truncate text-xs text-subtle">
                      {label(LEAD_TYPES, lead.type, tax)}
                      {lead.vehicle ? ` · ${lead.vehicle.brand} ${lead.vehicle.model}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <span
                      className={cn(
                        "chip",
                        lead.status === "NEW" && "border-gold/50 bg-gold-wash text-bronze",
                        lead.status === "WON" && "border-ok/40 bg-ok-wash text-ok",
                      )}
                    >
                      {label(LEAD_STATUS, lead.status, tax)}
                    </span>
                    <p className="mt-1 text-xs text-subtle tabular-nums">{formatDate(lead.createdAt, locale)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-subtle">{t.admin.noLeads}</p>
          )}
        </section>

        {/* Recently updated vehicles */}
        <section className="rounded-sm border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em]">{t.admin.recentVehicles}</h2>
            <Link
              href={localePath(locale, "/admin/vehicles")}
              className="link-underline cursor-pointer text-xs font-bold uppercase tracking-widest text-muted"
            >
              {t.cta.seeAll}
            </Link>
          </header>

          {recentVehicles.length ? (
            <ul className="divide-y divide-[var(--color-line)]">
              {recentVehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link
                    href={localePath(locale, `/admin/vehicles/${vehicle.id}`)}
                    className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3 transition-colors duration-200 hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <p className="truncate text-xs text-subtle tabular-nums">
                        {vehicle.reference} · {vehicle.published ? t.admin.published : t.admin.draft}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="font-semibold tabular-nums">
                        {formatCurrency(vehicle.price, locale)}
                      </p>
                      <StatusDot status={vehicle.status} locale={tax} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <IconCar size={32} className="text-subtle" />
              <p className="text-sm text-subtle">{t.admin.noData}</p>
              {can(user?.role, "vehicle.create") ? (
                <Link href={localePath(locale, "/admin/vehicles/new")} className="btn btn-primary btn-sm cursor-pointer">
                  <IconPlus size={14} />
                  {t.admin.addVehicle}
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {/* Activity */}
      {can(user?.role, "activity.read") && recentActivity.length ? (
        <section className="rounded-sm border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em]">
              <IconActivity size={15} className="text-red" />
              {t.admin.recentActivity}
            </h2>
            <Link
              href={localePath(locale, "/admin/activity")}
              className="link-underline inline-flex cursor-pointer items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted"
            >
              {t.cta.seeAll}
              <IconArrowRight size={13} />
            </Link>
          </header>
          <ul className="divide-y divide-[var(--color-line)]">
            {recentActivity.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0">
                  <strong className="font-semibold text-fg">{entry.user?.name ?? "—"}</strong>{" "}
                  <span className="text-muted">{entry.action}</span>{" "}
                  {entry.summary ? <span className="text-subtle">— {entry.summary}</span> : null}
                </span>
                <time className="shrink-0 text-xs text-subtle tabular-nums" dateTime={entry.createdAt.toISOString()}>
                  {formatDate(entry.createdAt, locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
