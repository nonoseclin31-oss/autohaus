"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDictionary, type Locale } from "@/i18n";
import {
  TOY_KINDS, TOY_CATEGORIES, TOY_ENGINES, CONDITIONS, label, optionsFor,
  type Locale as TaxLocale,
} from "@/lib/taxonomy";
import {
  IconMotorcycle, IconQuad, IconBuggy, IconJetski, IconBoat, IconHelmet,
  IconCompass, IconX, IconSpinner, IconCheck,
} from "./icons";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<string, typeof IconMotorcycle> = {
  MOTORCYCLE: IconMotorcycle,
  QUAD: IconQuad,
  BUGGY: IconBuggy,
  JETSKI: IconJetski,
  BOAT: IconBoat,
  ACCESSORY: IconHelmet,
};

const SELECT_KEYS = ["brand", "category", "engineType", "condition"] as const;
const ALL_KEYS = [...SELECT_KEYS, "kind", "availableOnly", "sort"] as const;

/**
 * The Big Toys filter.
 *
 * Two tiers, because the collection is browsed in two ways. The family row
 * is the first cut and the loudest control on the page — a visitor here
 * almost always knows whether they came for something with wheels or
 * something with a hull. Everything finer sits in one quiet inline row under
 * it, and the whole thing stays visible rather than hiding behind a drawer:
 * a leisure catalogue is small enough that four selects fit on screen, and a
 * drawer would be one tap between the visitor and the only cut they wanted.
 *
 * Every choice is a URL parameter, so a filtered view can be sent to someone.
 */
export function ToyFilters({
  locale,
  brands,
  counts,
  total,
}: {
  locale: Locale;
  brands: string[];
  /** Published pieces per family, so an empty world is not offered. */
  counts: Record<string, number>;
  total: number;
}) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const get = (key: string) => searchParams.get(key) ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
    });
  }

  function clearAll() {
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const activeCount = ALL_KEYS.filter((key) => searchParams.get(key)).length;
  const kind = get("kind");
  const kinds = Object.keys(TOY_KINDS);
  const totalCount = kinds.reduce((sum, key) => sum + (counts[key] ?? 0), 0);

  const selects: { key: string; label: string; empty: string; options: { value: string; label: string }[] }[] = [
    { key: "brand", label: t.vehicles.brand, empty: t.toys.anyBrand, options: brands.map((b) => ({ value: b, label: b })) },
    { key: "category", label: t.toys.category, empty: t.toys.anyCategory, options: optionsFor(TOY_CATEGORIES, tax) },
    { key: "engineType", label: t.vehicles.fuel, empty: t.toys.anyEngine, options: optionsFor(TOY_ENGINES, tax) },
    { key: "condition", label: t.vehicles.condition, empty: t.toys.anyCondition, options: optionsFor(CONDITIONS, tax) },
  ];

  return (
    <div className="space-y-5">
      {/* ── The four families ─────────────────────────────── */}
      <div>
        <h2 className="toys-eyebrow">
          <span className="h-px w-6 bg-gold" aria-hidden="true" />
          {t.toys.families}
        </h2>

        {/* Wraps rather than scrolls sideways. With four families a scroll
            strip was compact and harmless; with seven chips it hid five of
            them behind a swipe, and the family is the first cut a visitor
            makes on this page. Two rows of visible chips beat one row of
            hidden ones — so the chips shrink on a phone instead. */}
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label={t.toys.families}
        >
          <FamilyChip
            active={!kind}
            icon={IconCompass}
            label={t.toys.allFamilies}
            count={totalCount}
            onClick={() => update("kind", "")}
          />
          {kinds.map((key) => {
            const count = counts[key] ?? 0;
            return (
              <FamilyChip
                key={key}
                active={kind === key}
                icon={KIND_ICONS[key]}
                label={label(TOY_KINDS, key, tax)}
                count={count}
                // A family with nothing in it leads to an empty page. It is
                // shown, so the range is legible, but it cannot be chosen.
                disabled={count === 0}
                onClick={() => update("kind", key)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Everything finer ──────────────────────────────── */}
      <div className="rounded-[14px] border border-line bg-surface/70 p-3 backdrop-blur-sm sm:p-4">
        <div className="flex flex-wrap items-end gap-3">
          {selects.map((field) => (
            <div key={field.key} className="min-w-0 flex-1 basis-[calc(50%-0.375rem)] sm:basis-[11rem]">
              <label htmlFor={`tf-${field.key}`} className="label">{field.label}</label>
              <select
                id={`tf-${field.key}`}
                className="select h-11"
                value={get(field.key)}
                onChange={(event) => update(field.key, event.target.value)}
              >
                <option value="">{field.empty}</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="min-w-0 flex-1 basis-full sm:basis-[13rem]">
            <label htmlFor="tf-sort" className="label">{t.toys.sort}</label>
            <select
              id="tf-sort"
              className="select h-11"
              value={get("sort")}
              onChange={(event) => update("sort", event.target.value)}
            >
              <option value="">{t.toys.sortNewest}</option>
              <option value="price_asc">{t.toys.sortPriceAsc}</option>
              <option value="price_desc">{t.toys.sortPriceDesc}</option>
              <option value="power_desc">{t.toys.sortPower}</option>
              <option value="year_desc">{t.toys.sortYear}</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <button
            type="button"
            role="switch"
            aria-checked={get("availableOnly") === "1"}
            onClick={() => update("availableOnly", get("availableOnly") === "1" ? "" : "1")}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-200",
              get("availableOnly") === "1"
                ? "border-red bg-red-wash text-red"
                : "border-line-strong text-muted hover:border-fg hover:text-fg",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full border",
                get("availableOnly") === "1" ? "border-red bg-red text-white" : "border-line-strong",
              )}
              aria-hidden="true"
            >
              {get("availableOnly") === "1" ? <IconCheck size={11} /> : null}
            </span>
            {t.toys.availableOnly}
          </button>

          {/* Announced, not just drawn: the grid below changes without the
              page moving, so a screen reader needs to be told the count. */}
          <p className="text-sm text-muted tabular-nums" role="status" aria-live="polite">
            {pending ? (
              <IconSpinner size={15} className="inline text-red" />
            ) : (
              <>
                <strong className="font-semibold text-fg">{total}</strong>{" "}
                {total === 1 ? t.toys.onePiece : t.toys.found}
              </>
            )}
          </p>

          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="ms-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors duration-200 hover:text-red"
            >
              <IconX size={14} />
              {t.toys.clearFilters}
              <span className="rounded-full bg-fg/10 px-1.5 text-xs tabular-nums">{activeCount}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FamilyChip({
  active,
  disabled = false,
  icon: Icon,
  label: text,
  count,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: typeof IconMotorcycle;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        // 44px tall everywhere — the target size does not shrink with the
        // label. Only the padding and the tracking give way on a phone.
        "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] transition-all duration-200 sm:gap-2 sm:px-4 sm:text-sm sm:tracking-[0.08em]",
        active
          ? "border-red bg-red text-white shadow-[var(--shadow-sm)]"
          : "border-line-strong bg-surface/60 text-muted hover:border-red hover:text-fg",
        disabled && "cursor-not-allowed opacity-40 hover:border-line-strong hover:text-muted",
      )}
    >
      <Icon size={16} className="shrink-0 sm:hidden" />
      <Icon size={17} className="hidden shrink-0 sm:block" />
      {text}
      <span className={cn("text-xs tabular-nums", active ? "text-white/75" : "text-subtle")}>
        {count}
      </span>
    </button>
  );
}
