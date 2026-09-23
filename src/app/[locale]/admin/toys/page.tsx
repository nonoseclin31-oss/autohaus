import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath, formatCurrency, formatNumber, formatDate } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can, canEditToy, canDeleteToy } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { label, VEHICLE_STATUS, TOY_KINDS, isWaterToy, type Locale as TaxLocale } from "@/lib/taxonomy";
import { setToyStatus, toggleToyPublished, deleteToy } from "@/app/actions/toys";
import { StatusDot } from "@/components/status-vignette";
import {
  IconPlus, IconImage, IconEdit, IconEye, IconEyeOff, IconCompass,
  IconSearch, IconStar, IconArrowRight,
} from "@/components/icons";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PER_PAGE = 20;

export default async function AdminToysPage({
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
  // The layout redirects signed-out visitors, but a page renders in parallel
  // with its layout, so it has to guard for itself.
  if (!user) redirect(localePath(locale, "/login"));

  const q = typeof sp.q === "string" ? sp.q : "";
  const kindFilter = typeof sp.kind === "string" ? sp.kind : "";
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
    ...(kindFilter ? { kind: kindFilter } : {}),
    // "DRAFT" is not a status value; an unfinished listing is one that has
    // not been published, whatever its status says.
    ...(statusFilter === "DRAFT" ? { published: false } : statusFilter ? { status: statusFilter } : {}),
    ...(mine ? { ownerId: user.id } : {}),
  };

  const [toys, total, kindCounts, draftCount, grandTotal] = await Promise.all([
    prisma.toy.findMany({
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
    prisma.toy.count({ where }),
    prisma.toy.groupBy({ by: ["kind"], _count: { _all: true } }),
    prisma.toy.count({ where: { published: false } }),
    prisma.toy.count(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const countForKind = (kind: string) => kindCounts.find((c) => c.kind === kind)?._count._all ?? 0;

  const familyTabs = [
    { value: "", label: t.toys.allFamilies, count: grandTotal },
    ...Object.keys(TOY_KINDS).map((kind) => ({
      value: kind,
      label: label(TOY_KINDS, kind, tax),
      count: countForKind(kind),
    })),
  ];

  function hrefWith(overrides: Record<string, string>) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (kindFilter) qs.set("kind", kindFilter);
    if (statusFilter) qs.set("status", statusFilter);
    if (mine) qs.set("mine", "1");
    for (const [key, value] of Object.entries(overrides)) {
      if (value) qs.set(key, value);
      else qs.delete(key);
    }
    const query = qs.toString();
    return `${localePath(locale, "/admin/toys")}${query ? `?${query}` : ""}`;
  }

  type Row = (typeof toys)[number];

  /** The one usage figure that exists for this family: hours afloat, kilometres ashore. */
  function usageOf(toy: Row): string | null {
    if (isWaterToy(toy.kind)) {
      return toy.engineHours !== null ? `${formatNumber(toy.engineHours, locale)} ${t.toys.hoursShort}` : null;
    }
    return toy.mileage !== null ? `${formatNumber(toy.mileage, locale)} ${t.common.km}` : null;
  }

  /** Available / sale in progress / sold, with their full labels. */
  function statusButtons(toy: Row, editable: boolean, variant: "row" | "card") {
    if (!can(user!.role, "vehicle.status") || !editable) return null;
    const options = [
      { value: "AVAILABLE", title: t.admin.markAvailable, tone: "ok" },
      { value: "RESERVED", title: t.admin.markReserved, tone: "red" },
      { value: "SOLD", title: t.admin.markSold, tone: "red" },
    ];
    return (
      <div className={variant === "card" ? "grid grid-cols-3 gap-1.5 border-t border-line px-3 py-2.5" : "mt-1.5 flex flex-wrap gap-1"}>
        {options.map((option) => {
          const current = toy.status === option.value;
          return (
            <form key={option.value} action={setToyStatus} className="contents">
              <input type="hidden" name="id" value={toy.id} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="status" value={option.value} />
              <button
                type="submit"
                title={option.title}
                aria-label={option.title}
                aria-pressed={current}
                disabled={current}
                className={cn(
                  "cursor-pointer rounded-sm border font-bold uppercase tracking-wider transition-colors duration-200 disabled:cursor-default",
                  variant === "card" ? "min-h-11 px-1 text-[10px] leading-tight" : "px-2 py-1 text-[10px]",
                  current
                    ? option.tone === "ok" ? "border-ok bg-ok text-white" : "border-red bg-red text-white"
                    : option.tone === "ok"
                      ? "border-ok/40 bg-ok-wash text-ok hover:bg-ok/15"
                      : "border-red/40 text-red hover:bg-red/15",
                )}
              >
                {label(VEHICLE_STATUS, option.value, tax)}
              </button>
            </form>
          );
        })}
      </div>
    );
  }

  /** Publish, open on the site, edit, delete — in that order everywhere. */
  function rowActions(toy: Row, editable: boolean) {
    const iconButton =
      "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm transition-colors duration-200 md:min-h-9 md:min-w-9";
    return (
      <>
        {can(user!.role, "vehicle.publish") && editable ? (
          <form action={toggleToyPublished}>
            <input type="hidden" name="id" value={toy.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              title={toy.published ? t.admin.published : t.admin.draft}
              aria-label={toy.published ? t.admin.published : t.admin.draft}
              aria-pressed={toy.published}
              className={cn(iconButton, toy.published ? "text-ok hover:bg-ok/12" : "text-subtle hover:text-fg")}
            >
              {toy.published ? <IconEye size={17} /> : <IconEyeOff size={17} />}
            </button>
          </form>
        ) : null}

        {toy.published ? (
          <Link
            href={localePath(locale, `/big-toys/${toy.slug}`)}
            target="_blank"
            title={t.cta.viewDetails}
            aria-label={t.cta.viewDetails}
            className={cn(iconButton, "text-subtle hover:text-fg")}
          >
            <IconArrowRight size={17} />
          </Link>
        ) : null}

        {editable ? (
          <Link
            href={localePath(locale, `/admin/toys/${toy.id}`)}
            title={t.common.edit}
            aria-label={t.common.edit}
            className={cn(iconButton, "text-muted hover:bg-surface-3 hover:text-fg")}
          >
            <IconEdit size={17} />
          </Link>
        ) : null}

        {canDeleteToy(user) ? (
          <form action={deleteToy}>
            <input type="hidden" name="id" value={toy.id} />
            <input type="hidden" name="locale" value={locale} />
            <ConfirmSubmit compact label={t.admin.deleteToy} confirm={t.admin.confirmDelete} />
          </form>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl">{t.admin.toys}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t.admin.toysIntro}</p>
          <p className="mt-1 text-sm text-subtle tabular-nums">
            {total} {t.admin.toysFound}
          </p>
        </div>
        {/* On a phone: "add" first and full width, the arrangement screens
            side by side under it — instead of three full-width rows pushing
            the list below the fold. */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          {can(user.role, "vehicle.update.any") ? (
            <Link href={localePath(locale, "/admin/toys/showcase")} className="btn btn-solid min-w-0 cursor-pointer px-3 sm:px-[1.35rem]">
              <IconStar size={17} />
              {t.admin.toyPage}
            </Link>
          ) : null}
          {can(user.role, "vehicle.create") ? (
            <Link href={localePath(locale, "/admin/toys/new")} className="btn btn-primary order-first col-span-2 cursor-pointer sm:order-none">
              <IconPlus size={17} />
              {t.admin.addToy}
            </Link>
          ) : null}
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-3 rounded-sm border border-line bg-surface p-4">
        <form method="get" className="flex gap-2">
          {kindFilter ? <input type="hidden" name="kind" value={kindFilter} /> : null}
          {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
          {mine ? <input type="hidden" name="mine" value="1" /> : null}
          <div className="relative min-w-0 flex-1">
            <IconSearch size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="search" name="q" defaultValue={q} placeholder={t.admin.searchToys}
              className="input ps-9" aria-label={t.common.search}
            />
          </div>
          <button type="submit" className="btn btn-solid w-11 shrink-0 cursor-pointer px-0 sm:w-auto sm:px-[1.35rem]" aria-label={t.common.search}>
            <IconSearch size={17} className="sm:hidden" />
            <span className="hidden sm:inline">{t.common.search}</span>
          </button>
        </form>

        {/* The family is the first cut here too, and it is the one the
            catalogue is actually organised by. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {familyTabs.map((tab) => {
            const active = kindFilter === tab.value;
            return (
              <Link
                key={tab.value || "all"}
                href={hrefWith({ kind: tab.value, page: "" })}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
                  active ? "bg-bronze text-white" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
                )}
              >
                {tab.label}
                <span className={cn("text-xs tabular-nums", active ? "text-white/80" : "text-subtle")}>
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          {[
            { value: "", label: t.common.all },
            { value: "AVAILABLE", label: label(VEHICLE_STATUS, "AVAILABLE", tax) },
            { value: "RESERVED", label: label(VEHICLE_STATUS, "RESERVED", tax) },
            { value: "SOLD", label: label(VEHICLE_STATUS, "SOLD", tax) },
            { value: "DRAFT", label: `${t.admin.draft} (${draftCount})` },
          ].map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <Link
                key={tab.value || "all"}
                href={hrefWith({ status: tab.value, page: "" })}
                className={cn(
                  "inline-flex cursor-pointer items-center rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
                  active ? "bg-red text-white" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
                )}
              >
                {tab.label}
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

      {/* The list: cards up to a wide screen, where the table has room for
          its six columns without scrolling sideways. */}
      {toys.length ? (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
            {toys.map((toy) => {
              const editable = canEditToy(user, toy);
              return (
                <li key={toy.id}>
                  <article className="flex h-full flex-col overflow-hidden rounded-sm border border-line bg-surface">
                    <Link
                      href={editable ? localePath(locale, `/admin/toys/${toy.id}`) : localePath(locale, `/big-toys/${toy.slug}`)}
                      className="flex cursor-pointer gap-3 p-3 transition-colors duration-150 hover:bg-surface-2"
                    >
                      <Thumb url={toy.images[0]?.url} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-fg">{toy.brand} {toy.model}</p>
                        <p className="truncate text-xs text-subtle tabular-nums">
                          {[String(toy.year), usageOf(toy), toy.powerHp ? `${toy.powerHp} ${t.common.hp}` : null].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-1.5 text-base font-semibold tabular-nums">{formatCurrency(toy.price, locale)}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex rounded-sm bg-gold-wash px-2 py-0.5 text-xs font-semibold text-bronze">
                            {label(TOY_KINDS, toy.kind, tax)}
                          </span>
                          <StatusDot status={toy.status} locale={tax} />
                          {!toy.published ? <span className="chip">{t.admin.draft}</span> : null}
                          {toy.featured ? <IconStar size={13} className="text-bronze" aria-label={t.admin.toyFeatured} /> : null}
                        </div>
                      </div>
                    </Link>

                    {statusButtons(toy, editable, "card")}

                    <div className="mt-auto flex items-center gap-1 border-t border-line px-2 py-1.5">
                      {rowActions(toy, editable)}
                      <p className="ms-auto truncate ps-2 text-end font-mono text-[11px] text-subtle">{toy.reference}</p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-hidden rounded-sm border border-line bg-surface xl:block">
            <table className="w-full text-sm">
              <caption className="sr-only">{t.admin.toys}</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2 text-start">
                  {[t.admin.fBrand, t.admin.fKind, t.admin.fPrice, t.common.status, t.admin.owner, t.common.actions].map(
                    (heading, index) => (
                      <th
                        key={heading}
                        scope="col"
                        className={cn(
                          "px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle",
                          index === 2 || index === 5 ? "text-end" : "text-start",
                        )}
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {toys.map((toy) => {
                  const editable = canEditToy(user, toy);
                  const usage = usageOf(toy);
                  return (
                    <tr key={toy.id} className="transition-colors duration-150 hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface-3">
                            {toy.images[0] ? (
                              <Image src={toy.images[0].url} alt="" fill sizes="48px" className="object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center text-subtle">
                                <IconImage size={16} />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-fg">
                              {toy.brand} {toy.model}
                            </p>
                            <p className="truncate text-xs text-subtle tabular-nums">
                              {[String(toy.year), usage, toy.powerHp ? `${toy.powerHp} ${t.common.hp}` : null].filter(Boolean).join(" · ")}
                              {toy.featured ? (
                                <IconStar size={11} className="ms-1 inline text-bronze" aria-label={t.admin.toyFeatured} />
                              ) : null}
                            </p>
                            <p className="truncate font-mono text-[0.6875rem] text-subtle">
                              {toy.reference} · {toy._count.images} <IconImage size={9} className="inline" />
                              {toy._count.leads ? ` · ${toy._count.leads} ${t.admin.leads}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-sm bg-gold-wash px-2 py-1 text-xs font-semibold text-bronze">
                          {label(TOY_KINDS, toy.kind, tax)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-end">
                        <span className="font-semibold tabular-nums">{formatCurrency(toy.price, locale)}</span>
                      </td>

                      <td className="px-4 py-3">
                        <StatusDot status={toy.status} locale={tax} />
                        {statusButtons(toy, editable, "row")}
                      </td>

                      <td className="px-4 py-3">
                        <p className="truncate text-xs text-muted">{toy.owner?.name ?? t.admin.unassigned}</p>
                        <p className="text-xs text-subtle tabular-nums">{formatDate(toy.updatedAt, locale)}</p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">{rowActions(toy, editable)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 ? (
            <nav className="flex items-center justify-between gap-3 rounded-sm border border-line bg-surface px-4 py-3" aria-label={t.common.pagination}>
              <Link
                href={hrefWith({ page: String(Math.max(1, page - 1)) })}
                aria-disabled={page === 1}
                className={cn("btn btn-ghost btn-sm cursor-pointer", page === 1 && "pointer-events-none opacity-40")}
              >
                {t.common.previous}
              </Link>
              <span className="text-sm text-muted tabular-nums">
                {t.common.page} {page} {t.common.of} {pageCount}
              </span>
              <Link
                href={hrefWith({ page: String(Math.min(pageCount, page + 1)) })}
                aria-disabled={page === pageCount}
                className={cn("btn btn-ghost btn-sm cursor-pointer", page === pageCount && "pointer-events-none opacity-40")}
              >
                {t.common.next}
              </Link>
            </nav>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-line bg-surface px-6 py-20 text-center">
          <IconCompass size={44} className="text-subtle" />
          <p className="text-muted">{t.admin.noToys}</p>
          {can(user.role, "vehicle.create") ? (
            <Link href={localePath(locale, "/admin/toys/new")} className="btn btn-primary btn-sm mt-2 cursor-pointer">
              <IconPlus size={15} />
              {t.admin.addToy}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** The cover photo on a phone card, or a placeholder when there is none. */
function Thumb({ url }: { url: string | undefined }) {
  return (
    <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-sm bg-surface-3">
      {url ? (
        <Image src={url} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center text-subtle">
          <IconImage size={18} />
        </span>
      )}
    </div>
  );
}
