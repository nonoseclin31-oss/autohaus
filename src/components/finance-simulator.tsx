"use client";

import { useMemo, useState } from "react";
import { getDictionary, formatCurrency, formatNumber, type Locale } from "@/i18n";
import { DURATIONS, MILEAGES, quote, type Formula } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { IconEuro, IconInfo, IconKey, IconCheck } from "./icons";

export type FinanceVehicle = {
  id: string;
  label: string;
  price: number;
  /** Back-office overrides. Absent means the standard curve applies. */
  loaAvailable?: boolean;
  financeRate?: number | null;
  residualRate?: number | null;
  servicesMonthly?: number | null;
};

/**
 * Builds a quote for any car in the showroom.
 *
 * Every control is live: formula, term, annual mileage and the amount put
 * down. The figures come from lib/finance, so the page and the back office
 * quote the same way, and a car that carries its own rate or residual is
 * quoted on those rather than on the standard curve.
 */
export function FinanceSimulator({
  locale,
  vehicles,
  compact = false,
}: {
  locale: Locale;
  vehicles: FinanceVehicle[];
  /** On a vehicle page there is one car and no picker. */
  compact?: boolean;
}) {
  const t = getDictionary(locale);

  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [formula, setFormula] = useState<Formula>("LLD");
  const [months, setMonths] = useState(48);
  const [annualKm, setAnnualKm] = useState(15000);
  const [downPayment, setDownPayment] = useState(0);
  const [withServices, setWithServices] = useState(false);

  const selected = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];
  const price = selected?.price ?? 45000;
  const loaOffered = selected?.loaAvailable ?? true;
  const activeFormula: Formula = loaOffered ? formula : "LLD";

  const result = useMemo(
    () =>
      quote({
        price,
        months,
        annualKm,
        downPayment,
        formula: activeFormula,
        rate: selected?.financeRate ?? undefined,
        residualRate: selected?.residualRate ?? undefined,
        servicesMonthly: selected?.servicesMonthly ?? undefined,
        withServices,
      }),
    [price, months, annualKm, downPayment, activeFormula, selected, withServices],
  );

  // A third of the price is as far as a deposit usefully goes; beyond that the
  // customer is buying the car rather than leasing it.
  const maxDown = Math.max(500, Math.round((price * 0.3) / 500) * 500);

  return (
    <div className={cn("grid grid-cols-1 gap-6", compact ? "" : "lg:grid-cols-[minmax(0,1fr)_22rem]")}>
      <div className="space-y-6 rounded-sm border border-line bg-surface p-6">
        {/* Formula */}
        <div>
          <span className="label">{t.rental.formula}</span>
          <div role="tablist" className="mt-2 grid grid-cols-2 gap-2">
            {(["LLD", "LOA"] as const).map((key) => {
              const disabled = key === "LOA" && !loaOffered;
              const active = activeFormula === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={disabled}
                  onClick={() => setFormula(key)}
                  className={cn(
                    "cursor-pointer rounded-sm border px-3 py-2.5 text-start transition-colors duration-200",
                    active ? "border-red bg-red-wash" : "border-line hover:border-line-strong",
                    disabled && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span className="block text-sm font-semibold">{key === "LLD" ? t.rental.lld : t.rental.loa}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">
                    {key === "LLD" ? t.rental.lldShort : t.rental.loaShort}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {vehicles.length > 1 ? (
          <div>
            <label htmlFor="fs-vehicle" className="label">{t.rental.vehicle}</label>
            <select
              id="fs-vehicle"
              className="select"
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>
              ))}
            </select>
          </div>
        ) : null}

        <Choice
          label={t.rental.duration}
          options={DURATIONS.map((value) => ({ value, label: `${value} ${t.common.months}` }))}
          value={months}
          onChange={setMonths}
        />

        <Choice
          label={t.rental.annualMileage}
          options={MILEAGES.map((value) => ({ value, label: `${formatNumber(value, locale)} ${t.common.km}` }))}
          value={annualKm}
          onChange={setAnnualKm}
        />

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="fs-down" className="label mb-0">{t.rental.deposit}</label>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(downPayment, locale)}</span>
          </div>
          <input
            id="fs-down"
            type="range"
            min={0}
            max={maxDown}
            step={500}
            value={Math.min(downPayment, maxDown)}
            onChange={(event) => setDownPayment(Number(event.target.value))}
            className="mt-3 w-full cursor-pointer accent-[var(--color-red)]"
          />
        </div>

        {/* Services are part of a LLD; on a LOA they are a choice. */}
        {activeFormula === "LOA" ? (
          <label className="flex min-h-6 cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={withServices}
              onChange={(event) => setWithServices(event.target.checked)}
              className="mt-0.5 size-4 cursor-pointer accent-[var(--color-red)]"
            />
            <span>
              {t.rental.addServices}
              <span className="block text-xs text-muted">{t.rental.addServicesHelp}</span>
            </span>
          </label>
        ) : null}
      </div>

      {/* Quote */}
      <div className="flex flex-col gap-4 rounded-sm border border-line bg-surface-2 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
          {t.rental.estimatedMonthly}
        </p>
        <p className="flex items-baseline gap-1.5">
          <IconEuro size={20} className="text-red" />
          <span className="display text-4xl tabular-nums">{formatCurrency(result.monthly, locale)}</span>
          <span className="text-sm text-muted">{t.common.perMonth}</span>
        </p>

        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          <Row label={t.rental.rowTerm} value={`${months} ${t.common.months} · ${formatNumber(annualKm, locale)} ${t.common.km}/${t.rental.perYear}`} />
          {downPayment > 0 ? <Row label={t.rental.deposit} value={formatCurrency(downPayment, locale)} /> : null}
          {result.services > 0 ? (
            <Row label={t.rental.rowServices} value={`${formatCurrency(result.services, locale)}${t.common.perMonth}`} />
          ) : null}
          {result.purchaseOption !== null ? (
            <Row
              label={t.rental.purchaseOption}
              value={formatCurrency(result.purchaseOption, locale)}
              strong
            />
          ) : null}
          <Row label={t.rental.rowTotal} value={formatCurrency(result.totalCost, locale)} />
        </dl>

        <p className="flex items-start gap-2 rounded-sm bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted">
          {activeFormula === "LLD" ? (
            <IconCheck size={14} className="mt-0.5 shrink-0 text-ok" />
          ) : (
            <IconKey size={14} className="mt-0.5 shrink-0 text-gold" />
          )}
          <span>{activeFormula === "LLD" ? t.rental.lldNote : t.rental.loaNote}</span>
        </p>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-subtle">
          <IconInfo size={14} className="mt-0.5 shrink-0" />
          <span>{t.rental.estimateNote}</span>
        </p>
      </div>
    </div>
  );
}

function Choice<T extends number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-9 cursor-pointer rounded-sm border px-3 text-sm font-medium tabular-nums transition-colors duration-200",
              value === option.value
                ? "border-red bg-red text-white"
                : "border-line hover:border-line-strong",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("tabular-nums", strong ? "font-semibold text-fg" : "")}>{value}</dd>
    </div>
  );
}
