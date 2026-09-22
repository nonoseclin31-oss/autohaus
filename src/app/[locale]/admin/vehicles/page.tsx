import Link from "next/link";
import Image from "next/image";
import { getDictionary, resolveLocale, localePath, formatCurrency, formatNumber, formatDate } from "@/i18n";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can, canEditVehicle, canDeleteVehicle } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { label, VEHICLE_STATUS, type Locale as TaxLocale } from "@/lib/taxonomy";
import { setVehicleStatus, togglePublished, deleteVehicle } from "@/app/actions/vehicles";
import { StatusDot } from "@/components/status-vignette";
import {
  IconPlus, IconImage, IconEdit, IconTrash, IconEye, IconEyeOff, IconCar,
  IconSearch, IconStar, IconArrowRight,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PER_PAGE = 20;

export default async function AdminVehiclesPage({
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

  const q = typeof sp.q === "string" ? sp.q : "";
  const statusFilter = typeof sp.status === "string" ? sp.status : "";
  const mine = sp.mine === "1";
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const where = {
    ...(q
      ? {
          OR: [
            { brand: { contains: q } },
            { model: { contains: q } },
            { version: { contains: q } },
            { reference: { contains: q } },
          ],
        }
      : {}),
    // "DRAFT" is not one of the status values; an unfinished listing is one
    // that has not been published, whatever its status says.
    ...(statusFilter === "DRAFT"
      ? { published: false }
      : statusFilter
        ? { status: statusFilter }
        : {}),
    ...(mine ? { ownerId: user.id } : {}),
  };

  const [vehicles, total, counts, draftCount] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        images: { orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
        owner: { select: { id: true, name: true } },
        _count: { select: { images: true, leads: true } },
      },
    }),
    prisma.vehicle.count({ where }),
    prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.vehicle.count({ where: { published: false } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const countFor = (status: string) => counts.find((c) => c.status === status)?._count._all ?? 0;

  const filterTabs = [
    { value: "", label: t.common.all, count: counts.reduce((sum, c) => sum + c._count._all, 0) },
    { value: "AVAILABLE", label: label(VEHICLE_STATUS, "AVAILABLE", tax), count: countFor("AVAILABLE") },
    { value: "RESERVED", label: label(VEHICLE_STATUS, "RESERVED", tax), count: countFor("RESERVED") },
    { value: "SOLD", label: label(VEHICLE_STATUS, "SOLD", tax), count: countFor("SOLD") },
    { value: "COMING_SOON", label: label(VEHICLE_STATUS, "COMING_SOON", tax), count: countFor("COMING_SOON") },
    { value: "DRAFT", label: t.admin.draft, count: draftCount },
  ];

  function hrefWith(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    if (mine) params.set("mine", "1");
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    return `${localePath(locale, "/admin/vehicles")}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl">{t.admin.vehicles}</h1>
          <p className="mt-1 text-sm text-muted tabular-nums">
            {total} {t.vehicles.vehiclesFound}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can(user.role, "vehicle.update.any") ? (
            <Link
              href={localePath(locale, "/admin/vehicles/showcase")}
              className="btn btn-solid cursor-pointer"
            >
              <IconStar size={17} />
              {t.admin.homePage}
            </Link>
          ) : null}
          {can(user.role, "vehicle.create") ? (
            <Link href={localePath(locale, "/admin/vehicles/new")} className="btn btn-primary cursor-pointer">
              <IconPlus size={17} />
              {t.admin.addVehicle}
            </Link>
          ) : null}
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-3 rounded-sm border border-line bg-surface p-4">
        <form method="get" className="flex flex-wrap gap-2">
          {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
          {mine ? <input type="hidden" name="mine" value="1" /> : null}
          <div className="relative min-w-0 flex-1">
            <IconSearch size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="search" name="q" defaultValue={q} placeholder={t.admin.searchVehicles}
              className="input ps-9" aria-label={t.common.search}
            />
          </div>
          <button type="submit" className="btn btn-solid cursor-pointer">{t.common.search}</button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5">
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <Link
                key={tab.value || "all"}
                href={hrefWith({ status: tab.value, page: "" })}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
                  active ? "bg-red text-white" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
                )}
              >
                {tab.label}
                <span className={cn("text-xs tabular-nums", active ? "text-white/80" : "text-subtle")}>
                  {tab.count}
                </span>
              </Link>
            );
          })}

          <Link
            href={hrefWith({ mine: mine ? "" : "1", page: "" })}
            className={cn(
              "ms-auto inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
              mine ? "bg-gold text-ink" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
            )}
          >
            {t.admin.owner}: {t.admin.you}
          </Link>
        </div>
      </div>

      {/* Table */}
      {vehicles.length ? (
        <div className="overflow-hidden rounded-sm border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <caption className="sr-only">{t.admin.vehicles}</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2 text-start">
                  <th scope="col" className="px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                    {t.admin.fBrand} / {t.admin.fModel}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                    {t.admin.fReference}
                  </th>
                  <th scope="col" className="px-4 py-3 text-end text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                    {t.admin.fPrice}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                    {t.common.status}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                    {t.admin.owner}
                  </th>
                  <th scope="col" className="px-4 py-3 text-end text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                    {t.common.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {vehicles.map((vehicle) => {
                  const editable = canEditVehicle(user, vehicle);
                  return (
                    <tr key={vehicle.id} className="transition-colors duration-150 hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface-3">
                            {vehicle.images[0] ? (
                              <Image src={vehicle.images[0].url} alt="" fill sizes="48px" className="object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center text-subtle">
                                <IconImage size={16} />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-fg">
                              {vehicle.brand} {vehicle.model}
                            </p>
                            <p className="truncate text-xs text-subtle tabular-nums">
                              {vehicle.year} · {formatNumber(vehicle.mileage, locale)} {t.common.km} · {vehicle.powerHp} {t.common.hp}
                              {vehicle.featured ? (
                                <IconStar size={11} className="ms-1 inline text-bronze" aria-label={t.admin.featuredState} />
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted">{vehicle.reference}</span>
                        <p className="mt-0.5 text-xs text-subtle">
                          {vehicle._count.images} <IconImage size={10} className="inline" />
                          {vehicle._count.leads ? ` · ${vehicle._count.leads} ${t.admin.leads}` : ""}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-end">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(vehicle.price, locale)}
                        </span>
                        {vehicle.rentalAvailable && vehicle.rentalMonthly ? (
                          <p className="text-xs text-bronze tabular-nums">
                            {formatCurrency(vehicle.rentalMonthly, locale)}{t.common.perMonth}
                          </p>
                        ) : null}
                      </td>

                      {/* Status + red vignette quick actions */}
                      <td className="px-4 py-3">
                        <StatusDot status={vehicle.status} locale={tax} />
                        {can(user.role, "vehicle.status") && editable ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {[
                              { value: "AVAILABLE", short: "●", title: t.admin.markAvailable, tone: "ok" },
                              { value: "RESERVED", short: "◐", title: t.admin.markReserved, tone: "red" },
                              { value: "SOLD", short: "✕", title: t.admin.markSold, tone: "red" },
                            ].map((option) => (
                              <form key={option.value} action={setVehicleStatus}>
                                <input type="hidden" name="id" value={vehicle.id} />
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="status" value={option.value} />
                                <button
                                  type="submit"
                                  title={option.title}
                                  aria-label={option.title}
                                  disabled={vehicle.status === option.value}
                                  className={cn(
                                    "cursor-pointer rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 disabled:cursor-default disabled:opacity-40",
                                    option.tone === "ok"
                                      ? "border-ok/40 bg-ok-wash text-ok hover:bg-ok/15"
                                      : "border-red/40 text-red hover:bg-red/15",
                                  )}
                                >
                                  {label(VEHICLE_STATUS, option.value, tax).slice(0, 12)}
                                </button>
                              </form>
                            ))}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <p className="truncate text-xs text-muted">{vehicle.owner?.name ?? t.admin.unassigned}</p>
                        <p className="text-xs text-subtle tabular-nums">{formatDate(vehicle.updatedAt, locale)}</p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {can(user.role, "vehicle.publish") && editable ? (
                            <form action={togglePublished}>
                              <input type="hidden" name="id" value={vehicle.id} />
                              <input type="hidden" name="locale" value={locale} />
                              <button
                                type="submit"
                                title={vehicle.published ? t.admin.published : t.admin.draft}
                                aria-label={vehicle.published ? t.admin.published : t.admin.draft}
                                className={cn(
                                  "cursor-pointer rounded-sm p-2 transition-colors duration-200",
                                  vehicle.published ? "text-ok hover:bg-ok/12" : "text-subtle hover:text-fg",
                                )}
                              >
                                {vehicle.published ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                              </button>
                            </form>
                          ) : null}

                          {vehicle.published ? (
                            <Link
                              href={localePath(locale, `/vehicles/${vehicle.slug}`)}
                              target="_blank"
                              title={t.cta.viewDetails}
                              aria-label={t.cta.viewDetails}
                              className="cursor-pointer rounded-sm p-2 text-subtle transition-colors duration-200 hover:text-fg"
                            >
                              <IconArrowRight size={16} />
                            </Link>
                          ) : null}

                          {editable ? (
                            <Link
                              href={localePath(locale, `/admin/vehicles/${vehicle.id}`)}
                              title={t.common.edit}
                              aria-label={t.common.edit}
                              className="cursor-pointer rounded-sm p-2 text-muted transition-colors duration-200 hover:bg-surface-3 hover:text-fg"
                            >
                              <IconEdit size={16} />
                            </Link>
                          ) : null}

                          {canDeleteVehicle(user) ? (
                            <form action={deleteVehicle}>
                              <input type="hidden" name="id" value={vehicle.id} />
                              <input type="hidden" name="locale" value={locale} />
                              <button
                                type="submit"
                                title={t.common.delete}
                                aria-label={t.common.delete}
                                className="cursor-pointer rounded-sm p-2 text-subtle transition-colors duration-200 hover:bg-red/12 hover:text-red"
                              >
                                <IconTrash size={16} />
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 ? (
            <nav className="flex items-center justify-between gap-3 border-t border-line px-4 py-3" aria-label="Pagination">
              <Link
                href={hrefWith({ page: String(Math.max(1, page - 1)) })}
                className={cn("btn btn-ghost btn-sm cursor-pointer", page === 1 && "pointer-events-none opacity-40")}
              >
                {t.common.previous}
              </Link>
              <span className="text-sm text-muted tabular-nums">
                {t.common.page} {page} {t.common.of} {pageCount}
              </span>
              <Link
                href={hrefWith({ page: String(Math.min(pageCount, page + 1)) })}
                className={cn("btn btn-ghost btn-sm cursor-pointer", page === pageCount && "pointer-events-none opacity-40")}
              >
                {t.common.next}
              </Link>
            </nav>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-line bg-surface px-6 py-20 text-center">
          <IconCar size={44} className="text-subtle" />
          <p className="text-muted">{t.admin.noData}</p>
          {can(user.role, "vehicle.create") ? (
            <Link href={localePath(locale, "/admin/vehicles/new")} className="btn btn-primary btn-sm mt-2 cursor-pointer">
              <IconPlus size={15} />
              {t.admin.addVehicle}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
