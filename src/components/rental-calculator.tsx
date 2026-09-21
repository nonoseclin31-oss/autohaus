"use client";

import { useMemo, useState } from "react";
import { getDictionary, formatCurrency, formatNumber, type Locale } from "@/i18n";
import { estimateMonthly, RENTAL_DURATIONS, RENTAL_MILEAGES, cn } from "@/lib/utils";
import { LeadForm } from "./lead-form";
import { IconEuro, IconInfo } from "./icons";

type Option = { id: string; label: string; price: number };

export function RentalCalculator({
  locale,
  vehicles,
}: {
  locale: Locale;
  vehicles: Option[];
}) {
  const t = getDictionary(locale);

  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [months, setMonths] = useState<number>(48);
  const [annualKm, setAnnualKm] = useState<number>(15000);
  const [deposit, setDeposit] = useState<number>(0);

  const selected = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];
  const basePrice = selected?.price ?? 45000;

  const monthly = useMemo(
    () => estimateMonthly(basePrice, months, annualKm, deposit),
    [basePrice, months, annualKm, deposit],
  );

  const maxDeposit = Math.round((basePrice * 0.3) / 500) * 500;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Controls */}
      <div className="space-y-6 rounded-sm border border-line bg-surface p-6">
        {vehicles.length ? (
          <div>
            <label htmlFor="rc-vehicle" className="label">{t.nav.vehicles}</label>
            <select
              id="rc-vehicle"
              className="select"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Duration */}
        <fieldset>
          <legend className="label">{t.rental.duration}</legend>
          <div className="grid grid-cols-4 gap-2">
            {RENTAL_DURATIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMonths(value)}
                aria-pressed={months === value}
                className={cn(
                  "cursor-pointer rounded-sm border px-2 py-3 font-semibold tabular-nums transition-colors duration-200",
                  months === value
                    ? "border-red bg-red text-white"
                    : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                {value}
                <span className="block text-[10px] font-medium uppercase tracking-wider opacity-80">
                  {t.common.months}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Mileage */}
        <fieldset>
          <legend className="label">{t.rental.annualMileage}</legend>
          <div className="grid grid-cols-5 gap-2">
            {RENTAL_MILEAGES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAnnualKm(value)}
                aria-pressed={annualKm === value}
                className={cn(
                  "cursor-pointer rounded-sm border px-1 py-3 text-sm font-semibold tabular-nums transition-colors duration-200",
                  annualKm === value
                    ? "border-red bg-red text-white"
                    : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                {value / 1000}k
                <span className="block text-[10px] font-medium uppercase tracking-wider opacity-80">
                  {t.common.km}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Deposit */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="rc-deposit" className="label mb-0">{t.rental.deposit}</label>
            <span className="text-base font-semibold tabular-nums">
              {formatCurrency(deposit, locale)}
            </span>
          </div>
          <input
            id="rc-deposit"
            type="range"
            min={0}
            max={maxDeposit}
            step={500}
            value={Math.min(deposit, maxDeposit)}
            onChange={(e) => setDeposit(Number(e.target.value))}
            className="w-full cursor-pointer accent-[var(--color-red)]"
          />
          <div className="mt-1 flex justify-between text-xs text-subtle tabular-nums">
            <span>{formatCurrency(0, locale)}</span>
            <span>{formatCurrency(maxDeposit, locale)}</span>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-sm border border-red/40 bg-red/10 p-5">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
            <IconEuro size={14} className="text-red" />
            {t.rental.estimatedMonthly}
          </p>
          <p className="mt-1.5">
            <span className="display text-5xl tabular-nums">
              {formatCurrency(monthly, locale)}
            </span>
            <span className="ms-1 text-lg text-muted">{t.common.perMonth}</span>
          </p>
          <p className="mt-2 text-sm text-muted tabular-nums">
            {months} {t.common.months} · {formatNumber(annualKm, locale)} {t.common.km}/
            {locale === "fr" ? "an" : locale === "de" ? "Jahr" : locale === "es" ? "año" : locale === "zh" ? "年" : locale === "ar" ? "سنة" : "year"}
          </p>
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-subtle">
            <IconInfo size={13} className="mt-0.5 shrink-0" />
            {t.rental.estimateNote}
          </p>
        </div>
      </div>

      {/* Request */}
      <div className="rounded-sm border border-line bg-surface p-6">
        <h3 className="mb-1 text-lg font-semibold">{t.cta.getOffer}</h3>
        <p className="mb-5 text-sm text-muted">{t.rental.calcBody}</p>
        <LeadForm
          locale={locale}
          type="RENTAL"
          vehicleId={selected?.id}
          vehicleLabel={selected ? `${selected.label} · ${months} ${t.common.months} · ${formatNumber(annualKm, locale)} ${t.common.km}` : undefined}
          rentalDuration={months}
          rentalMileage={annualKm}
          compact
        />
      </div>
    </div>
  );
}
