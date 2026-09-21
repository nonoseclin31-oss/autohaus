"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { saveVehicle, type VehicleFormState } from "@/app/actions/vehicles";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { getDictionary, localePath, LOCALE_META, LOCALES, type Locale } from "@/i18n";
import {
  BODY_TYPES, CONDITIONS, SEGMENTS, FUELS, TRANSMISSIONS, DRIVETRAINS, PAINT_TYPES,
  UPHOLSTERY, EMISSION_CLASSES, COLORS, BRANDS, EQUIPMENT_GROUPS, VEHICLE_STATUS,
  equipmentByGroup, equipmentLabel, label, optionsFor, type Locale as TaxLocale,
} from "@/lib/taxonomy";
import { RENTAL_DURATIONS, RENTAL_MILEAGES, cn } from "@/lib/utils";
import {
  IconCar, IconBolt, IconFuel, IconPalette, IconWrench, IconEuro, IconTruck,
  IconCheckCircle, IconImage, IconGlobe, IconEye, IconEyeOff, IconSpinner, IconAlert, IconCheck, IconFlag,
} from "../icons";

export type VehicleFormValues = {
  id?: string;
  reference?: string; slug?: string;
  brand?: string; model?: string; version?: string | null; year?: number; vin?: string | null;
  bodyType?: string; condition?: string; segment?: string | null;
  fuel?: string; transmission?: string; gears?: number | null; drivetrain?: string | null;
  engineSize?: number | null; cylinders?: number | null; powerHp?: number; powerKw?: number | null;
  torqueNm?: number | null; acceleration?: number | null; topSpeed?: number | null;
  consumptionCombined?: number | null; consumptionUrban?: number | null; consumptionHighway?: number | null;
  co2?: number | null; emissionClass?: string | null; energyLabel?: string | null;
  batteryCapacity?: number | null; electricRange?: number | null; chargingTime?: string | null;
  doors?: number | null; seats?: number | null; colorExterior?: string | null; colorInterior?: string | null;
  paintType?: string | null; upholstery?: string | null;
  mileage?: number; firstRegistration?: string | null; previousOwners?: number | null;
  serviceHistory?: boolean; warrantyMonths?: number | null; nextInspection?: string | null;
  accidentFree?: boolean; nonSmoker?: boolean; imported?: boolean;
  price?: number; priceNet?: number | null; vatDeductible?: boolean; oldPrice?: number | null;
  negotiable?: boolean; financingMonthly?: number | null;
  rentalAvailable?: boolean; rentalMonthly?: number | null; rentalDeposit?: number | null;
  rentalFirstPayment?: number | null; rentalDurations?: number[]; rentalMileages?: number[];
  equipment?: string[]; videoUrl?: string | null;
  status?: string; published?: boolean; featured?: boolean; location?: string | null;
  ownerId?: string | null;
  images?: UploadedImage[];
  translations?: Record<string, { headline: string; description: string }>;
};

type Advisor = { id: string; name: string; role: string };

type Permissions = { canPublish: boolean; canSetStatus: boolean; canAssignOwner: boolean };

/* ───────────────────────── Field primitives ───────────────────────── */

function Field({
  id, label: fieldLabel, help, required, error, children, className,
}: {
  id: string; label: string; help?: string; required?: boolean; error?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {fieldLabel} {required ? <span className="text-red">*</span> : null}
      </label>
      {children}
      {error ? <p className="field-help text-red">{error}</p> : help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}

function Text({ id, name, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; name: string }) {
  return <input id={id} name={name} className="input" {...rest} />;
}

function Num({ id, name, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; name: string }) {
  return <input id={id} name={name} type="number" inputMode="decimal" className="input" {...rest} />;
}

function Select({
  id, name, defaultValue, options, placeholder,
}: {
  id: string; name: string; defaultValue?: string; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ""} className="select">
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({
  name, label: toggleLabel, defaultChecked, help,
}: {
  name: string; label: string; defaultChecked?: boolean; help?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-line bg-surface-2 p-3 transition-colors duration-200 hover:border-line-strong">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--color-red)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{toggleLabel}</span>
        {help ? <span className="mt-0.5 block text-xs text-subtle">{help}</span> : null}
      </span>
    </label>
  );
}

/**
 * One section of the form. Declared here, not inside the form component: a
 * component created during render gets a new identity on every render, so
 * React would tear down each panel and rebuild it — wiping the photos waiting
 * to be saved and every field typed so far. Hidden rather than unmounted, so
 * nothing is lost when switching sections either.
 */
function Panel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      hidden={!active}
      className="space-y-5"
    >
      {children}
    </section>
  );
}

function SaveBar({
  idle,
  busy,
  cancelHref,
  cancel,
  draft,
}: {
  idle: string;
  busy: string;
  cancelHref: string;
  cancel: string;
  draft: string;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <Link href={cancelHref} className="btn btn-ghost cursor-pointer">{cancel}</Link>
      {/* Saves what is there and keeps the listing off the public site, so it
          can be picked up later — by whoever gets to it first. */}
      <button
        type="submit"
        name="intent"
        value="draft"
        // The fields carry HTML `required`, which would block the submit before
        // it reaches the server. A draft is allowed to be incomplete, so this
        // button skips the browser's own check; the server still validates.
        formNoValidate
        className="btn btn-solid cursor-pointer"
        disabled={pending}
      >
        <IconEyeOff size={17} />
        {draft}
      </button>
      <button type="submit" name="intent" value="publish" className="btn btn-primary cursor-pointer" disabled={pending}>
        {pending ? <IconSpinner size={17} /> : <IconCheck size={17} />}
        {pending ? busy : idle}
      </button>
    </div>
  );
}

/* ───────────────────────────── Form ───────────────────────────── */

export function VehicleForm({
  locale,
  values = {},
  advisors,
  permissions,
}: {
  locale: Locale;
  values?: VehicleFormValues;
  advisors: Advisor[];
  permissions: Permissions;
}) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const [state, action] = useActionState<VehicleFormState, FormData>(saveVehicle, { status: "idle" });

  const [tab, setTab] = useState("identity");
  const [contentLocale, setContentLocale] = useState<Locale>(locale);
  const [rentalOn, setRentalOn] = useState(values.rentalAvailable ?? false);
  const [equipment, setEquipment] = useState<Set<string>>(new Set(values.equipment ?? []));
  const [status, setStatus] = useState(values.status ?? "AVAILABLE");

  const groups = equipmentByGroup();
  const err = (field: string) => (state.fieldErrors?.[field] ? t.common.required : undefined);

  const tabs = [
    { id: "identity", label: t.admin.secIdentity, Icon: IconCar },
    { id: "classification", label: t.admin.secClassification, Icon: IconFlag },
    { id: "powertrain", label: t.admin.secPowertrain, Icon: IconBolt },
    { id: "energy", label: t.admin.secEnergy, Icon: IconFuel },
    { id: "body", label: t.admin.secBody, Icon: IconPalette },
    { id: "history", label: t.admin.secHistory, Icon: IconWrench },
    { id: "pricing", label: t.admin.secPricing, Icon: IconEuro },
    { id: "rental", label: t.admin.secRental, Icon: IconTruck },
    { id: "equipment", label: t.admin.secEquipment, Icon: IconCheckCircle },
    { id: "media", label: t.admin.secMedia, Icon: IconImage },
    { id: "content", label: t.admin.secContent, Icon: IconGlobe },
    { id: "publication", label: t.admin.secPublication, Icon: IconEye },
  ];

  function toggleEquipment(key: string) {
    setEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setGroup(group: string, on: boolean) {
    setEquipment((prev) => {
      const next = new Set(prev);
      for (const key of groups[group] ?? []) {
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  return (
    <form action={action} className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="locale" value={locale} />
      {Array.from(equipment).map((key) => (
        <input key={key} type="hidden" name="equipment" value={key} />
      ))}

      {/* Section navigation */}
      <nav className="lg:sticky lg:top-24 lg:self-start" aria-label={t.admin.editVehicle}>
        <div className="lg:hidden">
          <label htmlFor="section-select" className="label">{t.common.actions}</label>
          <select
            id="section-select"
            className="select"
            value={tab}
            onChange={(e) => setTab(e.target.value)}
          >
            {tabs.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>

        <div role="tablist" aria-orientation="vertical" className="hidden space-y-0.5 lg:block">
          {tabs.map(({ id, label: tabLabel, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-sm border-s-2 px-3 py-2.5 text-start text-sm font-semibold transition-colors duration-200",
                  active
                    ? "border-red bg-surface-2 text-fg"
                    : "border-transparent text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon size={16} className={active ? "text-red" : ""} />
                {tabLabel}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Panels */}
      <div className="min-w-0">
        {state.status === "error" ? (
          <p role="alert" className="mb-5 flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-4 py-3 text-sm">
            <IconAlert size={16} className="mt-0.5 shrink-0 text-red" />
            {state.message === "forbidden" ? t.admin.permDenied : t.common.error}
          </p>
        ) : null}

        {/* ── Identity ── */}
        <Panel id="identity" active={tab === "identity"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="brand" label={t.admin.fBrand} required error={err("brand")}>
              <input
                id="brand" name="brand" list="brand-list" required defaultValue={values.brand ?? ""}
                className="input" autoComplete="off"
              />
              <datalist id="brand-list">
                {BRANDS.map((b) => <option key={b} value={b} />)}
              </datalist>
            </Field>

            <Field id="model" label={t.admin.fModel} required error={err("model")}>
              <Text id="model" name="model" required defaultValue={values.model ?? ""} maxLength={80} />
            </Field>

            <Field id="version" label={t.admin.fVersion} className="sm:col-span-2">
              <Text id="version" name="version" defaultValue={values.version ?? ""} maxLength={120}
                placeholder="quattro S line 50 TDI" />
            </Field>

            <Field id="year" label={t.admin.fYear} required error={err("year")}>
              <Num id="year" name="year" required min={1950} max={2100} step={1}
                defaultValue={values.year ?? new Date().getFullYear()} />
            </Field>

            <Field id="vin" label={t.admin.fVin}>
              <Text id="vin" name="vin" defaultValue={values.vin ?? ""} maxLength={20}
                className="input font-mono uppercase" />
            </Field>

            <Field id="reference" label={t.admin.fReference} help={t.admin.fReferenceHelp}>
              <Text id="reference" name="reference" defaultValue={values.reference ?? ""} maxLength={40} />
            </Field>

            <Field id="slug" label={t.admin.fSlug} help={t.admin.fSlugHelp}>
              <Text id="slug" name="slug" defaultValue={values.slug ?? ""} maxLength={100} />
            </Field>

            <Field id="location" label={t.admin.fLocation} className="sm:col-span-2">
              <Text id="location" name="location" defaultValue={values.location ?? ""} maxLength={120}
                placeholder="52159 Roetgen" />
            </Field>
          </div>
        </Panel>

        {/* ── Classification ── */}
        <Panel id="classification" active={tab === "classification"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="bodyType" label={t.vehicles.bodyType} required>
              <Select id="bodyType" name="bodyType" defaultValue={values.bodyType ?? "SEDAN"}
                options={optionsFor(BODY_TYPES, tax)} />
            </Field>
            <Field id="condition" label={t.vehicles.condition} required>
              <Select id="condition" name="condition" defaultValue={values.condition ?? "USED"}
                options={optionsFor(CONDITIONS, tax)} />
            </Field>
            <Field id="segment" label={t.vehicles.segment}>
              <Select id="segment" name="segment" defaultValue={values.segment ?? ""}
                options={optionsFor(SEGMENTS, tax)} placeholder="—" />
            </Field>
          </div>
        </Panel>

        {/* ── Powertrain ── */}
        <Panel id="powertrain" active={tab === "powertrain"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="fuel" label={t.spec.fuel} required>
              <Select id="fuel" name="fuel" defaultValue={values.fuel ?? "PETROL"} options={optionsFor(FUELS, tax)} />
            </Field>
            <Field id="transmission" label={t.spec.transmission} required>
              <Select id="transmission" name="transmission" defaultValue={values.transmission ?? "MANUAL"}
                options={optionsFor(TRANSMISSIONS, tax)} />
            </Field>
            <Field id="gears" label={t.spec.gears}>
              <Num id="gears" name="gears" min={1} max={12} step={1} defaultValue={values.gears ?? ""} />
            </Field>
            <Field id="drivetrain" label={t.spec.drivetrain}>
              <Select id="drivetrain" name="drivetrain" defaultValue={values.drivetrain ?? ""}
                options={optionsFor(DRIVETRAINS, tax)} placeholder="—" />
            </Field>
            <Field id="engineSize" label={`${t.spec.engineSize} (L)`}>
              <Num id="engineSize" name="engineSize" min={0} max={12} step={0.1} defaultValue={values.engineSize ?? ""} />
            </Field>
            <Field id="cylinders" label={t.spec.cylinders}>
              <Num id="cylinders" name="cylinders" min={0} max={16} step={1} defaultValue={values.cylinders ?? ""} />
            </Field>
            <Field id="powerHp" label={`${t.spec.power} (${t.common.hp})`} required error={err("powerHp")}>
              <Num id="powerHp" name="powerHp" required min={0} max={2000} step={1} defaultValue={values.powerHp ?? ""} />
            </Field>
            <Field id="powerKw" label={`${t.spec.power} (kW)`} help="Auto-calculated if left empty">
              <Num id="powerKw" name="powerKw" min={0} max={1500} step={1} defaultValue={values.powerKw ?? ""} />
            </Field>
            <Field id="torqueNm" label={`${t.spec.torque} (Nm)`}>
              <Num id="torqueNm" name="torqueNm" min={0} max={2000} step={5} defaultValue={values.torqueNm ?? ""} />
            </Field>
            <Field id="acceleration" label={`${t.spec.acceleration} (s)`}>
              <Num id="acceleration" name="acceleration" min={0} max={40} step={0.1} defaultValue={values.acceleration ?? ""} />
            </Field>
            <Field id="topSpeed" label={`${t.spec.topSpeed} (km/h)`}>
              <Num id="topSpeed" name="topSpeed" min={0} max={450} step={1} defaultValue={values.topSpeed ?? ""} />
            </Field>
          </div>
        </Panel>

        {/* ── Energy ── */}
        <Panel id="energy" active={tab === "energy"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="consumptionCombined" label={`${t.spec.consumptionCombined} (l/100km)`}>
              <Num id="consumptionCombined" name="consumptionCombined" min={0} max={40} step={0.1}
                defaultValue={values.consumptionCombined ?? ""} />
            </Field>
            <Field id="consumptionUrban" label={`${t.spec.consumptionUrban} (l/100km)`}>
              <Num id="consumptionUrban" name="consumptionUrban" min={0} max={40} step={0.1}
                defaultValue={values.consumptionUrban ?? ""} />
            </Field>
            <Field id="consumptionHighway" label={`${t.spec.consumptionHighway} (l/100km)`}>
              <Num id="consumptionHighway" name="consumptionHighway" min={0} max={40} step={0.1}
                defaultValue={values.consumptionHighway ?? ""} />
            </Field>
            <Field id="co2" label={`${t.spec.co2} (g/km)`}>
              <Num id="co2" name="co2" min={0} max={600} step={1} defaultValue={values.co2 ?? ""} />
            </Field>
            <Field id="emissionClass" label={t.spec.emissionClass}>
              <Select id="emissionClass" name="emissionClass" defaultValue={values.emissionClass ?? ""}
                options={optionsFor(EMISSION_CLASSES, tax)} placeholder="—" />
            </Field>
            <Field id="energyLabel" label={t.spec.energyLabel}>
              <Select id="energyLabel" name="energyLabel" defaultValue={values.energyLabel ?? ""}
                options={["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"].map((v) => ({ value: v, label: v }))}
                placeholder="—" />
            </Field>
            <Field id="batteryCapacity" label={`${t.spec.battery} (kWh)`}>
              <Num id="batteryCapacity" name="batteryCapacity" min={0} max={300} step={0.5}
                defaultValue={values.batteryCapacity ?? ""} />
            </Field>
            <Field id="electricRange" label={`${t.spec.range} (km)`}>
              <Num id="electricRange" name="electricRange" min={0} max={1500} step={1}
                defaultValue={values.electricRange ?? ""} />
            </Field>
            <Field id="chargingTime" label={t.spec.charging}>
              <Text id="chargingTime" name="chargingTime" defaultValue={values.chargingTime ?? ""}
                maxLength={60} placeholder="30 min (10–80 %, 150 kW)" />
            </Field>
          </div>
        </Panel>

        {/* ── Body ── */}
        <Panel id="body" active={tab === "body"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="doors" label={t.spec.doors}>
              <Num id="doors" name="doors" min={1} max={7} step={1} defaultValue={values.doors ?? ""} />
            </Field>
            <Field id="seats" label={t.spec.seats}>
              <Num id="seats" name="seats" min={1} max={9} step={1} defaultValue={values.seats ?? ""} />
            </Field>
            <Field id="colorExterior" label={t.spec.colorExterior}>
              <Select id="colorExterior" name="colorExterior" defaultValue={values.colorExterior ?? ""}
                options={optionsFor(COLORS, tax)} placeholder="—" />
            </Field>
            <Field id="paintType" label={t.spec.paint}>
              <Select id="paintType" name="paintType" defaultValue={values.paintType ?? ""}
                options={optionsFor(PAINT_TYPES, tax)} placeholder="—" />
            </Field>
            <Field id="colorInterior" label={t.spec.colorInterior}>
              <Select id="colorInterior" name="colorInterior" defaultValue={values.colorInterior ?? ""}
                options={optionsFor(COLORS, tax)} placeholder="—" />
            </Field>
            <Field id="upholstery" label={t.spec.upholstery}>
              <Select id="upholstery" name="upholstery" defaultValue={values.upholstery ?? ""}
                options={optionsFor(UPHOLSTERY, tax)} placeholder="—" />
            </Field>
          </div>
        </Panel>

        {/* ── History ── */}
        <Panel id="history" active={tab === "history"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="mileage" label={`${t.spec.mileage} (${t.common.km})`} required>
              <Num id="mileage" name="mileage" min={0} max={2000000} step={100} defaultValue={values.mileage ?? 0} />
            </Field>
            <Field id="firstRegistration" label={t.spec.firstRegistration}>
              <input id="firstRegistration" name="firstRegistration" type="date" className="input"
                defaultValue={values.firstRegistration ?? ""} />
            </Field>
            <Field id="previousOwners" label={t.spec.owners}>
              <Num id="previousOwners" name="previousOwners" min={0} max={30} step={1}
                defaultValue={values.previousOwners ?? ""} />
            </Field>
            <Field id="warrantyMonths" label={`${t.spec.warranty} (${t.common.months})`}>
              <Num id="warrantyMonths" name="warrantyMonths" min={0} max={120} step={1}
                defaultValue={values.warrantyMonths ?? ""} />
            </Field>
            <Field id="nextInspection" label={t.spec.nextInspection}>
              <input id="nextInspection" name="nextInspection" type="date" className="input"
                defaultValue={values.nextInspection ?? ""} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle name="serviceHistory" label={t.spec.serviceHistory} defaultChecked={values.serviceHistory} />
            <Toggle name="accidentFree" label={t.spec.accidentFree} defaultChecked={values.accidentFree ?? true} />
            <Toggle name="nonSmoker" label={t.spec.nonSmoker} defaultChecked={values.nonSmoker ?? true} />
            <Toggle name="imported" label={t.spec.imported} defaultChecked={values.imported} />
          </div>
        </Panel>

        {/* ── Pricing ── */}
        <Panel id="pricing" active={tab === "pricing"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="price" label={t.admin.fPrice} required error={err("price")}>
              <Num id="price" name="price" required min={0} max={100000000} step={100} defaultValue={values.price ?? ""} />
            </Field>
            <Field id="priceNet" label={t.admin.fPriceNet}>
              <Num id="priceNet" name="priceNet" min={0} step={100} defaultValue={values.priceNet ?? ""} />
            </Field>
            <Field id="oldPrice" label={t.admin.fOldPrice}>
              <Num id="oldPrice" name="oldPrice" min={0} step={100} defaultValue={values.oldPrice ?? ""} />
            </Field>
            <Field id="financingMonthly" label={t.admin.fFinancingMonthly}>
              <Num id="financingMonthly" name="financingMonthly" min={0} step={10}
                defaultValue={values.financingMonthly ?? ""} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle name="vatDeductible" label={t.admin.fVatDeductible} defaultChecked={values.vatDeductible} />
            <Toggle name="negotiable" label={t.admin.fNegotiable} defaultChecked={values.negotiable} />
          </div>
        </Panel>

        {/* ── Rental ── */}
        <Panel id="rental" active={tab === "rental"}>
          <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-gold/45 bg-gold-wash p-4 transition-colors duration-200">
            <input
              type="checkbox" name="rentalAvailable" checked={rentalOn}
              onChange={(e) => setRentalOn(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--color-gold)]"
            />
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.08em]">
                {t.admin.fRentalAvailable}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{t.rental.subtitle}</span>
            </span>
          </label>

          <div className={cn("space-y-5", !rentalOn && "pointer-events-none opacity-45")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="rentalMonthly" label={t.admin.fRentalMonthly}>
                <Num id="rentalMonthly" name="rentalMonthly" min={0} step={5} defaultValue={values.rentalMonthly ?? ""} />
              </Field>
              <Field id="rentalDeposit" label={t.admin.fRentalDeposit}>
                <Num id="rentalDeposit" name="rentalDeposit" min={0} step={100} defaultValue={values.rentalDeposit ?? ""} />
              </Field>
              <Field id="rentalFirstPayment" label={t.admin.fRentalFirstPayment}>
                <Num id="rentalFirstPayment" name="rentalFirstPayment" min={0} step={50}
                  defaultValue={values.rentalFirstPayment ?? ""} />
              </Field>
            </div>

            <fieldset>
              <legend className="label">{t.admin.fRentalDurations}</legend>
              <div className="flex flex-wrap gap-2">
                {RENTAL_DURATIONS.map((value) => (
                  <label
                    key={value}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2 text-sm transition-colors duration-200 hover:border-line-strong"
                  >
                    <input
                      type="checkbox" name="rentalDurations" value={value}
                      defaultChecked={values.rentalDurations?.includes(value) ?? [36, 48].includes(value)}
                      className="size-4 cursor-pointer accent-[var(--color-red)]"
                    />
                    <span className="tabular-nums">{value} {t.common.months}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label">{t.admin.fRentalMileages}</legend>
              <div className="flex flex-wrap gap-2">
                {RENTAL_MILEAGES.map((value) => (
                  <label
                    key={value}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2 text-sm transition-colors duration-200 hover:border-line-strong"
                  >
                    <input
                      type="checkbox" name="rentalMileages" value={value}
                      defaultChecked={values.rentalMileages?.includes(value) ?? [10000, 15000, 20000].includes(value)}
                      className="size-4 cursor-pointer accent-[var(--color-red)]"
                    />
                    <span className="tabular-nums">{value / 1000}k {t.common.km}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Panel>

        {/* ── Equipment ── */}
        <Panel id="equipment" active={tab === "equipment"}>
          <p className="text-sm text-muted">
            <strong className="font-semibold tabular-nums">{equipment.size}</strong>{" "}
            {t.admin.equipmentSelected}
          </p>

          <div className="space-y-5">
            {Object.keys(EQUIPMENT_GROUPS).map((group) => {
              const keys = groups[group] ?? [];
              const allOn = keys.every((k) => equipment.has(k));
              return (
                <fieldset key={group} className="rounded-sm border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
                      {label(EQUIPMENT_GROUPS, group, tax)}
                    </legend>
                    <button
                      type="button"
                      onClick={() => setGroup(group, !allOn)}
                      className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted transition-colors duration-200 hover:text-fg"
                    >
                      {allOn ? t.admin.clearGroup : t.admin.selectAll}
                    </button>
                  </div>

                  <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {keys.map((key) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-start gap-2.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
                      >
                        <input
                          type="checkbox"
                          checked={equipment.has(key)}
                          onChange={() => toggleEquipment(key)}
                          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--color-red)]"
                        />
                        {equipmentLabel(key, tax)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </Panel>

        {/* ── Media ── */}
        <Panel id="media" active={tab === "media"}>
          <ImageUploader locale={locale} initial={values.images ?? []} />
          <Field id="videoUrl" label={t.admin.fVideoUrl}>
            <Text id="videoUrl" name="videoUrl" type="url" defaultValue={values.videoUrl ?? ""} maxLength={300}
              placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
        </Panel>

        {/* ── Content (multilingual) ── */}
        <Panel id="content" active={tab === "content"}>
          <p className="field-help">{t.admin.contentHelp}</p>

          <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-line pb-3">
            {LOCALES.map((code) => {
              const active = contentLocale === code;
              const filled =
                !!values.translations?.[code]?.headline || !!values.translations?.[code]?.description;
              return (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setContentLocale(code)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-semibold transition-colors duration-200",
                    active ? "bg-red text-white" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
                  )}
                >
                  {LOCALE_META[code].name}
                  {filled ? (
                    <span className={cn("size-1.5 rounded-full", active ? "bg-white" : "bg-ok")} aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {LOCALES.map((code) => (
            <div key={code} hidden={contentLocale !== code} dir={LOCALE_META[code].dir} className="space-y-4">
              <Field id={`headline_${code}`} label={`${t.admin.fHeadline} — ${LOCALE_META[code].name}`}>
                <Text
                  id={`headline_${code}`}
                  name={`headline_${code}`}
                  defaultValue={values.translations?.[code]?.headline ?? ""}
                  maxLength={160}
                />
              </Field>
              <Field id={`description_${code}`} label={`${t.admin.fDescription} — ${LOCALE_META[code].name}`}>
                <textarea
                  id={`description_${code}`}
                  name={`description_${code}`}
                  rows={10}
                  maxLength={6000}
                  defaultValue={values.translations?.[code]?.description ?? ""}
                  className="textarea"
                />
              </Field>
            </div>
          ))}
        </Panel>

        {/* ── Publication ── */}
        <Panel id="publication" active={tab === "publication"}>
          <fieldset>
            <legend className="label">{t.common.status}</legend>
            <p className="field-help mb-3">{t.admin.statusHelp}</p>
            <input type="hidden" name="status" value={status} />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "AVAILABLE", text: t.admin.markAvailable, tone: "ok" },
                { value: "RESERVED", text: t.admin.markReserved, tone: "red" },
                { value: "SOLD", text: t.admin.markSold, tone: "red" },
                { value: "COMING_SOON", text: label(VEHICLE_STATUS, "COMING_SOON", tax), tone: "gold" },
              ].map((option) => {
                const active = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!permissions.canSetStatus}
                    onClick={() => setStatus(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "cursor-pointer rounded-sm border px-3 py-3 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                      active && option.tone === "ok" && "border-ok bg-ok/15 text-fg",
                      active && option.tone === "red" && "border-red bg-red/18 text-fg",
                      active && option.tone === "gold" && "border-gold bg-gold-wash text-fg",
                      !active && "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
                    )}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            {permissions.canPublish ? (
              <Toggle name="published" label={t.admin.visibility} defaultChecked={values.published} />
            ) : null}
            <Toggle name="featured" label={t.admin.featuredState} defaultChecked={values.featured} />
          </div>

          {permissions.canAssignOwner ? (
            <Field id="ownerId" label={t.admin.owner}>
              <Select
                id="ownerId"
                name="ownerId"
                defaultValue={values.ownerId ?? ""}
                placeholder={t.admin.unassigned}
                options={advisors.map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
          ) : null}
        </Panel>

        <SaveBar
          idle={t.common.save}
          busy={t.common.saving}
          cancel={t.common.cancel}
          cancelHref={localePath(locale, "/admin/vehicles")}
          draft={t.admin.saveDraft}
        />
      </div>
    </form>
  );
}
