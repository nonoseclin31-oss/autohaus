"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDictionary, type Locale } from "@/i18n";
import {
  BODY_TYPES, FUELS, TRANSMISSIONS, CONDITIONS, SEGMENTS, optionsFor, type Locale as TaxLocale,
} from "@/lib/taxonomy";
import { IconFilter, IconX, IconSearch, IconSpinner } from "./icons";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
  brands: string[];
  total: number;
};

export function VehicleFilters({ locale, brands, total }: Props) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

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

  const activeCount = [
    "brand", "bodyType", "fuel", "transmission", "condition", "segment",
    "priceMin", "priceMax", "yearMin", "yearMax", "mileageMax", "powerMin",
    "availableOnly", "rentalOnly", "q",
  ].filter((key) => searchParams.get(key)).length;

  const selects: { key: string; label: string; options: { value: string; label: string }[] }[] = [
    { key: "brand", label: t.vehicles.brand, options: brands.map((b) => ({ value: b, label: b })) },
    { key: "bodyType", label: t.vehicles.bodyType, options: optionsFor(BODY_TYPES, tax) },
    { key: "fuel", label: t.vehicles.fuel, options: optionsFor(FUELS, tax) },
    { key: "transmission", label: t.vehicles.transmission, options: optionsFor(TRANSMISSIONS, tax) },
    { key: "condition", label: t.vehicles.condition, options: optionsFor(CONDITIONS, tax) },
    { key: "segment", label: t.vehicles.segment, options: optionsFor(SEGMENTS, tax) },
  ];

  const body = (
    <div className="space-y-5">
      {/* Free text */}
      <div>
        <label htmlFor="f-q" className="label">{t.common.search}</label>
        <div className="relative">
          <IconSearch
            size={16}
            className="pointer-events-none absolute inset-inline-start-3 start-3 top-1/2 -translate-y-1/2 text-subtle"
          />
          <input
            id="f-q"
            type="search"
            defaultValue={get("q")}
            onChange={(e) => update("q", e.target.value)}
            placeholder={t.admin.searchVehicles}
            className="input ps-9"
          />
        </div>
      </div>

      {selects.map((field) => (
        <div key={field.key}>
          <label htmlFor={`f-${field.key}`} className="label">{field.label}</label>
          <select
            id={`f-${field.key}`}
            className="select"
            value={get(field.key)}
            onChange={(e) => update(field.key, e.target.value)}
          >
            <option value="">{t.common.all}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}

      {/* Price */}
      <fieldset>
        <legend className="label">{t.vehicles.priceRange} (€)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" inputMode="numeric" min={0} step={1000}
            aria-label={`${t.vehicles.priceRange} ${t.vehicles.minPrice}`}
            placeholder={t.vehicles.minPrice} className="input"
            defaultValue={get("priceMin")} onChange={(e) => update("priceMin", e.target.value)}
          />
          <input
            type="number" inputMode="numeric" min={0} step={1000}
            aria-label={`${t.vehicles.priceRange} ${t.vehicles.maxPrice}`}
            placeholder={t.vehicles.maxPrice} className="input"
            defaultValue={get("priceMax")} onChange={(e) => update("priceMax", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Year */}
      <fieldset>
        <legend className="label">{t.vehicles.yearRange}</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" inputMode="numeric" min={1950} max={2100}
            aria-label={`${t.vehicles.yearRange} ${t.vehicles.minPrice}`}
            placeholder={t.vehicles.minPrice} className="input"
            defaultValue={get("yearMin")} onChange={(e) => update("yearMin", e.target.value)}
          />
          <input
            type="number" inputMode="numeric" min={1950} max={2100}
            aria-label={`${t.vehicles.yearRange} ${t.vehicles.maxPrice}`}
            placeholder={t.vehicles.maxPrice} className="input"
            defaultValue={get("yearMax")} onChange={(e) => update("yearMax", e.target.value)}
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor="f-mileage" className="label">{t.vehicles.mileageMax} ({t.common.km})</label>
        <input
          id="f-mileage" type="number" inputMode="numeric" min={0} step={5000} className="input"
          defaultValue={get("mileageMax")} onChange={(e) => update("mileageMax", e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="f-power" className="label">{t.vehicles.powerMin} ({t.common.hp})</label>
        <input
          id="f-power" type="number" inputMode="numeric" min={0} step={10} className="input"
          defaultValue={get("powerMin")} onChange={(e) => update("powerMin", e.target.value)}
        />
      </div>

      {/* Toggles */}
      <div className="space-y-2.5 border-t border-line pt-4">
        {[
          { key: "availableOnly", label: t.vehicles.availableOnly },
          { key: "rentalOnly", label: t.vehicles.rentalOnly },
        ].map((toggle) => (
          <label
            key={toggle.key}
            className="flex cursor-pointer items-center gap-2.5 text-sm text-fg transition-colors duration-200 hover:text-red"
          >
            <input
              type="checkbox"
              className="size-4 cursor-pointer accent-[var(--color-red)]"
              checked={get(toggle.key) === "1"}
              onChange={(e) => update(toggle.key, e.target.checked ? "1" : "")}
            />
            {toggle.label}
          </label>
        ))}
      </div>

      {activeCount > 0 ? (
        <button type="button" onClick={clearAll} className="btn btn-ghost btn-sm w-full cursor-pointer">
          <IconX size={14} />
          {t.vehicles.clearAll}
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className="flex items-center gap-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="btn btn-solid cursor-pointer">
          <IconFilter size={16} />
          {t.common.filters}
          {activeCount ? (
            <span className="ms-1 rounded-full bg-red px-1.5 text-xs font-bold text-white tabular-nums">
              {activeCount}
            </span>
          ) : null}
        </button>
        <span className="text-sm text-muted tabular-nums">
          {total} {t.vehicles.vehiclesFound}
        </span>
        {pending ? <IconSpinner size={16} className="text-red" /> : null}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block" aria-label={t.common.filters}>
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain rounded-sm border border-line bg-surface p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em]">
              <IconFilter size={16} className="text-red" />
              {t.common.filters}
            </h2>
            {pending ? <IconSpinner size={16} className="text-red" /> : null}
          </div>
          {body}
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button" aria-label={t.common.close} onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-ink/35 backdrop-blur-sm animate-fade"
          />
          <div className="absolute inset-y-0 start-0 flex w-[min(22rem,90vw)] flex-col border-e border-line bg-surface animate-rise">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold">{t.common.filters}</h2>
              <button
                type="button" onClick={() => setOpen(false)} aria-label={t.common.close}
                className="cursor-pointer rounded-sm p-2 text-muted transition-colors duration-200 hover:text-fg"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{body}</div>
            <div className="border-t border-line p-4">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-primary w-full cursor-pointer">
                {t.common.showing} {total} {t.common.results}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function SortSelect({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function change(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sort", value);
    else params.delete("sort");
    params.delete("page");
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="whitespace-nowrap text-sm text-muted">{t.common.sortBy}</label>
      <select
        id="sort"
        className={cn("select", "w-auto min-w-[11rem]")}
        value={searchParams.get("sort") ?? ""}
        onChange={(e) => change(e.target.value)}
      >
        <option value="">{t.vehicles.sortNewest}</option>
        <option value="price_asc">{t.vehicles.sortPriceAsc}</option>
        <option value="price_desc">{t.vehicles.sortPriceDesc}</option>
        <option value="mileage_asc">{t.vehicles.sortMileage}</option>
        <option value="power_desc">{t.vehicles.sortPower}</option>
      </select>
    </div>
  );
}
