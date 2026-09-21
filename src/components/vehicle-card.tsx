import Link from "next/link";
import Image from "next/image";
import { StatusVignette, SoldOverlay } from "./status-vignette";
import { IconGauge, IconFuel, IconGearbox, IconCalendar, IconImage, IconBolt, IconStar } from "./icons";
import { formatCurrency, formatNumber, getDictionary, localePath, type Locale } from "@/i18n";
import { label, FUELS, TRANSMISSIONS, CONDITIONS, type Locale as TaxLocale } from "@/lib/taxonomy";
import type { VehicleListItem } from "@/lib/vehicles";
import { cn } from "@/lib/utils";

export function VehicleCard({
  vehicle,
  locale,
  priority = false,
  showRental = false,
}: {
  vehicle: VehicleListItem;
  locale: Locale;
  priority?: boolean;
  showRental?: boolean;
}) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const title = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  const sold = vehicle.status === "SOLD";

  return (
    <article
      className={cn(
        "card-focus group relative flex h-full flex-col overflow-hidden rounded-[4px] border border-line bg-surface",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-md)]",
        "focus-within:border-red",
      )}
    >
      {/* Media */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-2">
        {vehicle.coverUrl ? (
          <Image
            src={vehicle.coverUrl}
            alt={`${title} ${vehicle.version ?? ""}`.trim()}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className={cn(
              "object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              sold ? "grayscale-[0.5]" : "group-hover:scale-[1.04]",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-subtle">
            <IconImage size={36} />
          </div>
        )}

        <SoldOverlay status={vehicle.status} locale={tax} />

        {/* Red vignette: sold / sale in progress */}
        <div className="absolute start-4 top-4 z-10">
          <StatusVignette status={vehicle.status} locale={tax} />
        </div>

        {vehicle.featured && vehicle.status === "AVAILABLE" ? (
          <span
            className="absolute start-4 top-4 z-10 inline-flex size-7 items-center justify-center rounded-[2px] bg-gold text-ink shadow-[var(--shadow-sm)]"
            title={t.home.featuredTitle}
          >
            <IconStar size={13} />
            <span className="sr-only">{t.home.featuredTitle}</span>
          </span>
        ) : null}

        <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
          {vehicle.condition === "NEW" ? (
            <span className="rounded-[2px] bg-surface/92 px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-fg backdrop-blur-sm">
              {label(CONDITIONS, "NEW", tax)}
            </span>
          ) : null}
          {vehicle.imageCount > 1 ? (
            <span className="inline-flex items-center gap-1 rounded-[2px] bg-surface/92 px-2 py-1 text-[0.6875rem] font-semibold text-muted backdrop-blur-sm">
              <IconImage size={11} />
              {vehicle.imageCount}
            </span>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold leading-snug tracking-[-0.01em]">
            <Link
              href={localePath(locale, `/vehicles/${vehicle.slug}`)}
              className="cursor-pointer outline-none transition-colors duration-200 after:absolute after:inset-0 after:content-[''] group-hover:text-red"
            >
              {title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 text-sm text-muted">
            {vehicle.version ?? vehicle.headline ?? label(CONDITIONS, vehicle.condition, tax)}
          </p>
        </div>

        {/* Key specs */}
        {/* Labels wrap rather than clamp: German "Doppelkupplung" and Spanish
            "Híbrido enchufable" do not fit one line at this column width, and
            the card's price block is mt-auto inside an h-full grid cell, so an
            extra line here never breaks alignment with neighbouring cards. */}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm leading-snug text-muted">
          <li className="flex items-start gap-2">
            <IconCalendar size={14} className="mt-0.5 shrink-0 text-subtle" />
            <span className="tabular-nums">{vehicle.year}</span>
          </li>
          <li className="flex items-start gap-2">
            <IconGauge size={14} className="mt-0.5 shrink-0 text-subtle" />
            <span className="tabular-nums">
              {formatNumber(vehicle.mileage, locale)} {t.common.km}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <IconFuel size={14} className="mt-0.5 shrink-0 text-subtle" />
            <span className="min-w-0">{label(FUELS, vehicle.fuel, tax)}</span>
          </li>
          <li className="flex items-start gap-2">
            <IconGearbox size={14} className="mt-0.5 shrink-0 text-subtle" />
            <span className="min-w-0">{label(TRANSMISSIONS, vehicle.transmission, tax)}</span>
          </li>
        </ul>

        {/* Price block.
            min-w-0 on the price column and flex-wrap on the price line matter:
            a car with both a current and a struck-through old price, in a
            locale with a wide power unit (de "PS", ar "حصان"), otherwise
            pushes this row past the card edge. */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-t border-line pt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
                {formatCurrency(vehicle.price, locale)}
              </span>
              {vehicle.oldPrice && vehicle.oldPrice > vehicle.price ? (
                <span className="text-sm text-subtle line-through tabular-nums">
                  {formatCurrency(vehicle.oldPrice, locale)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-subtle">
              {vehicle.vatDeductible ? t.detail.vatDeductible : t.detail.vatIncluded}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            <IconBolt size={14} className="text-red" />
            <span className="font-semibold tabular-nums">{vehicle.powerHp}</span>
            <span className="text-xs text-subtle">{t.common.hp}</span>
          </div>
        </div>

        {showRental && vehicle.rentalAvailable && vehicle.rentalMonthly ? (
          <p className="rounded-[2px] bg-gold-wash px-3 py-2.5 text-sm text-muted">
            {t.detail.monthlyFrom}{" "}
            <strong className="font-semibold text-bronze tabular-nums">
              {formatCurrency(vehicle.rentalMonthly, locale)}
            </strong>
            <span className="text-xs">{t.common.perMonth}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[4px] border border-line bg-surface">
      <div className="aspect-[16/10] w-full animate-pulse bg-surface-2" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-surface-2" />
          ))}
        </div>
        <div className="h-8 w-1/2 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}
