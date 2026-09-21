import Link from "next/link";
import type { Metadata } from "next";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { listVehicles, getAvailableBrands, type VehicleFilters as Filters } from "@/lib/vehicles";
import { VehicleCard } from "@/components/vehicle-card";
import { VehicleFilters, SortSelect } from "@/components/vehicle-filters";
import { IconCar, IconChevronLeft, IconChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const t = getDictionary((await params).locale);
  return { title: t.vehicles.title, description: t.vehicles.subtitle };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function num(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export default async function VehiclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const locale = resolveLocale((await params).locale);
  const sp = await searchParams;
  const t = getDictionary(locale);

  const filters: Filters = {
    brand: str(sp.brand),
    bodyType: str(sp.bodyType),
    fuel: str(sp.fuel),
    transmission: str(sp.transmission),
    condition: str(sp.condition),
    segment: str(sp.segment),
    priceMin: num(sp.priceMin),
    priceMax: num(sp.priceMax),
    yearMin: num(sp.yearMin),
    yearMax: num(sp.yearMax),
    mileageMax: num(sp.mileageMax),
    powerMin: num(sp.powerMin),
    availableOnly: sp.availableOnly === "1",
    rentalOnly: sp.rentalOnly === "1",
    q: str(sp.q),
    sort: str(sp.sort),
    page: num(sp.page) ?? 1,
    perPage: 12,
  };

  const [{ items, total, page, pageCount }, brands] = await Promise.all([
    listVehicles(filters, locale),
    getAvailableBrands(),
  ]);

  const queryString = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (typeof value === "string" && value && key !== "page") params.set(key, value);
    }
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `${localePath(locale, "/vehicles")}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <header className="studio border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="eyebrow mb-3">
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            {t.nav.vehicles}
          </p>
          <h1 className="display text-4xl sm:text-5xl">
            {t.vehicles.title}
          </h1>
          <p className="mt-3 max-w-xl text-muted">{t.vehicles.subtitle}</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[17rem_1fr] lg:px-8">
        <VehicleFilters locale={locale} brands={brands} total={total} />

        <section className="mt-6 lg:mt-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="hidden text-sm text-muted tabular-nums lg:block">
              <strong className="text-base font-semibold">{total}</strong> {t.vehicles.vehiclesFound}
            </p>
            <SortSelect locale={locale} />
          </div>

          {items.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((vehicle, i) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    locale={locale}
                    priority={i < 3}
                    showRental
                  />
                ))}
              </div>

              {pageCount > 1 ? (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                  <Link
                    href={queryString(Math.max(1, page - 1))}
                    aria-disabled={page === 1}
                    className={cn(
                      "btn btn-ghost btn-sm cursor-pointer",
                      page === 1 && "pointer-events-none opacity-40",
                    )}
                  >
                    <IconChevronLeft size={15} />
                    <span className="hidden sm:inline">{t.common.previous}</span>
                  </Link>

                  <span className="px-3 text-sm text-muted tabular-nums">
                    {t.common.page} {page} {t.common.of} {pageCount}
                  </span>

                  <Link
                    href={queryString(Math.min(pageCount, page + 1))}
                    aria-disabled={page === pageCount}
                    className={cn(
                      "btn btn-ghost btn-sm cursor-pointer",
                      page === pageCount && "pointer-events-none opacity-40",
                    )}
                  >
                    <span className="hidden sm:inline">{t.common.next}</span>
                    <IconChevronRight size={15} />
                  </Link>
                </nav>
              ) : null}
            </>
          ) : (
            <div className="card flex flex-col items-center gap-3 px-6 py-20 text-center">
              <IconCar size={44} className="text-subtle" />
              <h2 className="text-lg font-semibold">
                {t.vehicles.noResultsTitle}
              </h2>
              <p className="max-w-sm text-sm text-muted">{t.vehicles.noResultsBody}</p>
              <Link href={localePath(locale, "/vehicles")} className="btn btn-ghost btn-sm mt-2 cursor-pointer">
                {t.vehicles.clearAll}
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
