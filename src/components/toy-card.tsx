import Link from "next/link";
import Image from "next/image";
import { StatusVignette, SoldOverlay } from "./status-vignette";
import {
  IconCalendar, IconGauge, IconClock, IconBolt, IconImage, IconStar,
  IconSeat, IconRuler, IconEngineBadge,
} from "./icons";
import { formatCurrency, formatNumber, getDictionary, localePath, type Locale } from "@/i18n";
import {
  label, CONDITIONS, TOY_KINDS, isWaterToy, type Locale as TaxLocale,
} from "@/lib/taxonomy";
import { toyUsage, type ToyListItem } from "@/lib/toys";
import { cn } from "@/lib/utils";

/**
 * One Big Toy.
 *
 * Deliberately not the car card with a flag on it. The corners are soft, the
 * title is condensed capitals rather than a serif, and the four figures under
 * the photo change with the family: kilometres and a capacity for the two
 * that roll, engine hours and a hull length for the two that float. A jet ski
 * has no gearbox to name and a boat has no mileage — printing an em dash in
 * those slots would say nothing four times over.
 */
export function ToyCard({
  toy,
  locale,
  priority = false,
}: {
  toy: ToyListItem;
  locale: Locale;
  priority?: boolean;
}) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const title = [toy.brand, toy.model].filter(Boolean).join(" ");
  const sold = toy.status === "SOLD";
  const water = isWaterToy(toy.kind);
  const usage = toyUsage(toy);

  return (
    <article
      className={cn(
        "card-focus group relative flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-surface",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-1 hover:border-red hover:shadow-[var(--shadow-md)]",
        "focus-within:border-red",
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-2">
        {toy.coverUrl ? (
          <Image
            src={toy.coverUrl}
            alt={`${title} ${toy.version ?? ""}`.trim()}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className={cn(
              "object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              sold ? "grayscale-[0.5]" : "group-hover:scale-[1.05]",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-subtle">
            <IconImage size={36} />
          </div>
        )}

        <SoldOverlay status={toy.status} locale={tax} />

        <div className="absolute start-4 top-4 z-10">
          <StatusVignette status={toy.status} locale={tax} />
        </div>

        {toy.featured && toy.status === "AVAILABLE" ? (
          <span
            className="absolute start-4 top-4 z-10 inline-flex size-7 items-center justify-center rounded-full bg-gold text-ink shadow-[var(--shadow-sm)]"
            title={t.admin.toyFeatured}
          >
            <IconStar size={13} />
            <span className="sr-only">{t.admin.toyFeatured}</span>
          </span>
        ) : null}

        <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
          {/* The family, always. It is the first thing a visitor sorts by,
              and a cropped photo of a hull is not always obvious. */}
          <span className="rounded-full bg-canvas/85 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-bronze backdrop-blur-sm">
            {label(TOY_KINDS, toy.kind, tax)}
          </span>
          {toy.imageCount > 1 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas/85 px-2 py-1 text-[0.6875rem] font-semibold text-muted backdrop-blur-sm">
              <IconImage size={11} />
              {toy.imageCount}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="toys-display text-2xl">
            <Link
              href={localePath(locale, `/big-toys/${toy.slug}`)}
              className="cursor-pointer outline-none transition-colors duration-200 after:absolute after:inset-0 after:content-[''] group-hover:text-red"
            >
              {title}
            </Link>
          </h3>
          <p className="mt-1.5 line-clamp-1 text-sm text-muted">
            {toy.version ?? toy.headline ?? label(CONDITIONS, toy.condition, tax)}
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm leading-snug text-muted">
          <li className="flex items-start gap-2">
            <IconCalendar size={14} className="mt-0.5 shrink-0 text-subtle" />
            <span className="tabular-nums">{toy.year}</span>
          </li>

          {usage ? (
            <li className="flex items-start gap-2">
              {usage.unit === "km" ? (
                <IconGauge size={14} className="mt-0.5 shrink-0 text-subtle" />
              ) : (
                <IconClock size={14} className="mt-0.5 shrink-0 text-subtle" />
              )}
              <span className="tabular-nums">
                {formatNumber(usage.value, locale)}{" "}
                {usage.unit === "km" ? t.common.km : t.toys.hoursShort}
              </span>
            </li>
          ) : null}

          {/* The measure that matters in each world: how big the engine is on
              land, how long the hull is on water. */}
          {water ? (
            toy.lengthM ? (
              <li className="flex items-start gap-2">
                <IconRuler size={14} className="mt-0.5 shrink-0 text-subtle" />
                <span className="tabular-nums">{formatNumber(toy.lengthM, locale)} m</span>
              </li>
            ) : null
          ) : toy.displacement ? (
            <li className="flex items-start gap-2">
              <IconEngineBadge size={14} className="mt-0.5 shrink-0 text-subtle" />
              <span className="tabular-nums">
                {formatNumber(toy.displacement, locale)} cm³
              </span>
            </li>
          ) : null}

          {toy.seats ? (
            /* The number alone, with the seat icon and an accessible label.
               "1 places" is wrong in French and Spanish, "2 place" is wrong
               in English, and a card is not the place to carry six sets of
               plural rules for a figure the icon already explains. */
            <li className="flex items-start gap-2">
              <IconSeat size={14} className="mt-0.5 shrink-0 text-subtle" />
              <span className="tabular-nums">
                {toy.seats}
                <span className="sr-only"> {t.toys.seats}</span>
              </span>
            </li>
          ) : null}
        </ul>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-t border-line pt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
                {formatCurrency(toy.price, locale)}
              </span>
              {toy.oldPrice && toy.oldPrice > toy.price ? (
                <span className="text-sm text-subtle line-through tabular-nums">
                  {formatCurrency(toy.oldPrice, locale)}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-subtle">
              {toy.vatDeductible ? t.detail.vatDeductible : t.detail.vatIncluded}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            <IconBolt size={14} className="text-red" />
            <span className="font-semibold tabular-nums">{toy.powerHp}</span>
            <span className="text-xs text-subtle">{t.common.hp}</span>
          </div>
        </div>

        {toy.trailerIncluded ? (
          <p className="rounded-full bg-gold-wash px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-bronze">
            {t.toys.trailer}
          </p>
        ) : null}
      </div>
    </article>
  );
}
