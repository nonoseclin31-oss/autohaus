"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { saveToy, type ToyFormState } from "@/app/actions/toys";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { getDictionary, localePath, LOCALE_META, LOCALES, type Locale } from "@/i18n";
import {
  TOY_KINDS, TOY_CATEGORIES, TOY_ENGINES, TOY_TRANSMISSIONS, TOY_LICENCES,
  TOY_BRANDS, TOY_EQUIPMENT_GROUPS, CONDITIONS, COLORS, VEHICLE_STATUS,
  toyEquipmentByGroup, toyEquipmentLabel, isWaterToy, label, optionsFor,
  type Locale as TaxLocale,
} from "@/lib/taxonomy";
import {
  IconCompass, IconEngineBadge, IconRuler, IconWrench, IconEuro,
  IconCheckCircle, IconImage, IconGlobe, IconEye, IconEyeOff, IconSpinner,
  IconAlert, IconCheck, IconDots, IconMotorcycle, IconQuad, IconJetski, IconBoat,
} from "../icons";
import { cn } from "@/lib/utils";

export type ToyFormValues = {
  id?: string;
  reference?: string; slug?: string;
  kind?: string; brand?: string; model?: string; version?: string | null;
  year?: number; hullId?: string | null;
  condition?: string; category?: string | null;
  engineType?: string; displacement?: number | null; cylinders?: number | null;
  strokes?: number | null; powerHp?: number; powerKw?: number | null;
  torqueNm?: number | null; topSpeed?: number | null; transmission?: string | null;
  engineCount?: number | null;
  mileage?: number | null; engineHours?: number | null; dryWeight?: number | null;
  seats?: number | null; lengthM?: number | null; beamM?: number | null;
  fuelCapacity?: number | null; rangeKm?: number | null;
  trailerIncluded?: boolean; registered?: boolean; licence?: string | null;
  warrantyMonths?: number | null; serviceHistory?: boolean; accidentFree?: boolean;
  previousOwners?: number | null; firstRegistration?: string | null;
  colorExterior?: string | null;
  price?: number; priceNet?: number | null; vatDeductible?: boolean;
  oldPrice?: number | null; negotiable?: boolean; financingMonthly?: number | null;
  equipment?: string[]; videoUrl?: string | null;
  status?: string; published?: boolean; featured?: boolean; location?: string | null;
  ownerId?: string | null;
  images?: UploadedImage[];
  translations?: Record<string, { headline: string; description: string }>;
};

type Advisor = { id: string; name: string; role: string };
type Permissions = { canPublish: boolean; canSetStatus: boolean; canAssignOwner: boolean };

const KIND_ICONS: Record<string, typeof IconMotorcycle> = {
  MOTORCYCLE: IconMotorcycle,
  QUAD: IconQuad,
  JETSKI: IconJetski,
  BOAT: IconBoat,
};

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
  id: string; name: string; defaultValue?: string;
  options: { value: string; label: string }[]; placeholder?: string;
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
 * One section. Declared outside the form component on purpose: a component
 * created during render gets a new identity every render, so React would tear
 * down each panel and rebuild it — wiping the photos waiting to be saved.
 */
function Panel({ id, active, children }: { id: string; active: boolean; children: React.ReactNode }) {
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

function FIELD_LABEL(t: ReturnType<typeof getDictionary>, field: string): string {
  const names: Record<string, string> = {
    brand: t.admin.fBrand,
    model: t.admin.fModel,
    year: t.admin.fYear,
    powerHp: t.spec.power,
    price: t.admin.fPrice,
  };
  return names[field] ?? field;
}

const FIELD_TAB: Record<string, string> = {
  brand: "identity",
  model: "identity",
  year: "identity",
  powerHp: "engine",
  price: "pricing",
};

function SaveBar({
  idle, busy, cancelHref, cancel, draft, more,
}: {
  idle: string; busy: string; cancelHref: string; cancel: string; draft: string; more: string;
}) {
  const { pending } = useFormStatus();
  // Three buttons side by side stack into three rows on a phone and swallow
  // the screen. The two secondary ones fold into a sheet; from `md` up the
  // very same nodes sit back in the row.
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // The sheet is drawn above the bar but sits before the trigger in the DOM,
    // so Tab alone would walk straight past it.
    sheet.current?.querySelector<HTMLElement>("a, button, input")?.focus();

    const away = (event: PointerEvent) => {
      if (!bar.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div
      ref={bar}
      className="sticky bottom-0 z-20 -mx-4 mt-8 flex items-center gap-2 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:gap-3"
    >
      <div
        ref={sheet}
        id="toy-save-more"
        className={cn(
          "absolute inset-x-0 bottom-full flex-col items-stretch gap-2 border-t border-line bg-canvas px-4 py-3",
          open ? "flex" : "hidden",
          "md:static md:flex md:flex-1 md:flex-row md:items-center md:justify-end md:gap-3 md:border-0 md:bg-transparent md:p-0",
        )}
      >
        <Link href={cancelHref} className="btn btn-ghost w-full cursor-pointer md:w-auto">
          {cancel}
        </Link>
        <button
          type="submit"
          name="intent"
          value="draft"
          // The fields carry HTML `required`, which would block the submit
          // before it reaches the server. A draft is allowed to be incomplete.
          formNoValidate
          className="btn btn-solid w-full cursor-pointer md:w-auto"
          disabled={pending}
        >
          <IconEyeOff size={17} />
          {draft}
        </button>
      </div>

      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-controls="toy-save-more"
        aria-label={more}
        className="btn btn-solid w-11 shrink-0 cursor-pointer px-0 md:hidden"
      >
        <IconDots size={18} />
      </button>

      <button
        type="submit"
        name="intent"
        value="publish"
        // Required fields sit in sections hidden while another is open. The
        // browser refuses to report a field it cannot show and cancels the
        // submit silently — the button looks dead. The server validates and
        // answers with the offending fields instead.
        formNoValidate
        className="btn btn-primary flex-1 cursor-pointer md:flex-none"
        disabled={pending}
      >
        {pending ? <IconSpinner size={17} /> : <IconCheck size={17} />}
        {pending ? busy : idle}
      </button>
    </div>
  );
}

/* ───────────────────────────── Form ───────────────────────────── */

export function ToyForm({
  locale,
  values = {},
  advisors,
  permissions,
}: {
  locale: Locale;
  values?: ToyFormValues;
  advisors: Advisor[];
  permissions: Permissions;
}) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const [state, action] = useActionState<ToyFormState, FormData>(saveToy, { status: "idle" });

  const [tab, setTab] = useState("identity");
  const [contentLocale, setContentLocale] = useState<Locale>(locale);
  const [equipment, setEquipment] = useState<Set<string>>(new Set(values.equipment ?? []));
  const [status, setStatus] = useState(values.status ?? "AVAILABLE");

  // The family drives the form. A jet ski has no mileage and a motorcycle has
  // no beam; asking for both would leave half the sheet permanently blank and
  // invite someone to fill it with a guess.
  const [kind, setKind] = useState(values.kind ?? "MOTORCYCLE");
  const water = isWaterToy(kind);

  const groups = toyEquipmentByGroup();
  const err = (field: string) => (state.fieldErrors?.[field] ? t.common.required : undefined);
  const missing = Object.keys(state.fieldErrors ?? {});

  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef<FormData | null>(null);

  // React empties a form once its action has run. That is right after a save
  // that worked and wrong after one that did not: a listing rejected for a
  // missing price would come back with every other field blank and could
  // never be completed. The values are kept at submit time and put back.
  useEffect(() => {
    const form = formRef.current;
    const data = submitted.current;
    if (state.status !== "error" || !form || !data) return;

    for (const element of Array.from(form.elements)) {
      const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const name = field.name;
      if (!name || field.type === "hidden" || field.type === "file") continue;
      // Anything React drives from state kept its value; touching it here
      // would only push the two out of step.
      if (name === "equipment" || name === "status" || name === "kind") continue;

      if (field.type === "checkbox" || field.type === "radio") {
        (field as HTMLInputElement).checked = data.getAll(name).includes(field.value);
        continue;
      }
      const value = data.get(name);
      if (typeof value === "string") field.value = value;
    }
  }, [state]);

  // A rejected save has to land on what it is complaining about, and this
  // order is the order of the sections, so it opens the first gap.
  useEffect(() => {
    if (!missing.length) return;
    const target = ["brand", "model", "year", "powerHp", "price"].find((f) => missing.includes(f));
    if (target) setTab(FIELD_TAB[target]);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = [
    { id: "identity", label: t.admin.secIdentity, Icon: IconCompass },
    { id: "engine", label: t.admin.secToyEngine, Icon: IconEngineBadge },
    { id: "measures", label: t.admin.secToyMeasures, Icon: IconRuler },
    { id: "papers", label: t.admin.secToyPapers, Icon: IconWrench },
    { id: "pricing", label: t.admin.secPricing, Icon: IconEuro },
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
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => { submitted.current = new FormData(event.currentTarget); }}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="kind" value={kind} />
      {Array.from(equipment).map((key) => (
        <input key={key} type="hidden" name="equipment" value={key} />
      ))}

      {/* Section navigation */}
      <nav className="lg:sticky lg:top-24 lg:self-start" aria-label={t.admin.editToy}>
        <div className="lg:hidden">
          <label htmlFor="toy-section-select" className="label">{t.common.actions}</label>
          <select
            id="toy-section-select"
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
                    ? "border-bronze bg-surface-2 text-fg"
                    : "border-transparent text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon size={16} className={active ? "text-bronze" : ""} />
                {tabLabel}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0">
        {state.status === "error" ? (
          <p role="alert" className="mb-5 flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-4 py-3 text-sm">
            <IconAlert size={16} className="mt-0.5 shrink-0 text-red" />
            <span>
              {state.message === "forbidden"
                ? t.admin.permDenied
                : missing.length
                  ? `${t.admin.missingFields} ${missing.map((f) => FIELD_LABEL(t, f)).join(", ")}`
                  : t.common.error}
            </span>
          </p>
        ) : null}

        {/* ── Identity ── */}
        <Panel id="identity" active={tab === "identity"}>
          <fieldset>
            <legend className="label">
              {t.admin.fKind} <span className="text-red">*</span>
            </legend>
            <p className="field-help mb-3">{t.admin.fKindHelp}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Object.keys(TOY_KINDS).map((key) => {
                const Icon = KIND_ICONS[key];
                const active = kind === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setKind(key)}
                    aria-pressed={active}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-2 rounded-sm border px-3 py-4 text-sm font-semibold transition-colors duration-200",
                      active
                        ? "border-bronze bg-gold-wash text-fg"
                        : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
                    )}
                  >
                    <Icon size={26} className={active ? "text-bronze" : ""} />
                    {label(TOY_KINDS, key, tax)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="brand" label={t.admin.fBrand} required error={err("brand")}>
              <input
                id="brand" name="brand" list="toy-brand-list" required
                defaultValue={values.brand ?? ""} className="input" autoComplete="off"
              />
              <datalist id="toy-brand-list">
                {TOY_BRANDS.map((b) => <option key={b} value={b} />)}
              </datalist>
            </Field>

            <Field id="model" label={t.admin.fModel} required error={err("model")}>
              <Text id="model" name="model" required defaultValue={values.model ?? ""} maxLength={80} />
            </Field>

            <Field id="version" label={t.admin.fVersion} className="sm:col-span-2">
              <Text id="version" name="version" defaultValue={values.version ?? ""} maxLength={120}
                placeholder={water ? "300 HP Rotax · Premium" : "R 1300 GS Trophy"} />
            </Field>

            <Field id="year" label={t.admin.fYear} required error={err("year")}>
              <Num id="year" name="year" required min={1950} max={2100} step={1}
                defaultValue={values.year ?? new Date().getFullYear()} />
            </Field>

            <Field id="condition" label={t.vehicles.condition} required>
              <Select id="condition" name="condition" defaultValue={values.condition ?? "USED"}
                options={optionsFor(CONDITIONS, tax)} />
            </Field>

            <Field id="category" label={t.admin.fCategory}>
              <Select id="category" name="category" defaultValue={values.category ?? ""}
                options={optionsFor(TOY_CATEGORIES, tax)} placeholder="—" />
            </Field>

            <Field id="hullId" label={t.admin.fHullId}>
              <Text id="hullId" name="hullId" defaultValue={values.hullId ?? ""} maxLength={30}
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

        {/* ── Engine & performance ── */}
        <Panel id="engine" active={tab === "engine"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="engineType" label={t.vehicles.fuel} required>
              <Select id="engineType" name="engineType" defaultValue={values.engineType ?? "PETROL"}
                options={optionsFor(TOY_ENGINES, tax)} />
            </Field>

            <Field id="powerHp" label={t.spec.power} required error={err("powerHp")}>
              <Num id="powerHp" name="powerHp" required min={0} max={5000} step={1}
                defaultValue={values.powerHp ?? ""} />
            </Field>

            <Field id="powerKw" label="kW" help={t.admin.fReferenceHelp}>
              <Num id="powerKw" name="powerKw" min={0} max={4000} step={1} defaultValue={values.powerKw ?? ""} />
            </Field>

            <Field id="displacement" label={t.admin.fDisplacement}>
              <Num id="displacement" name="displacement" min={0} max={20000} step={1}
                defaultValue={values.displacement ?? ""} />
            </Field>

            <Field id="cylinders" label={t.admin.fCylinders}>
              <Num id="cylinders" name="cylinders" min={0} max={16} step={1}
                defaultValue={values.cylinders ?? ""} />
            </Field>

            <Field id="strokes" label={t.admin.fStrokes}>
              <Select id="strokes" name="strokes" defaultValue={values.strokes ? String(values.strokes) : ""}
                placeholder="—"
                options={[
                  { value: "2", label: `2${t.toys.strokeValue}` },
                  { value: "4", label: `4${t.toys.strokeValue}` },
                ]} />
            </Field>

            <Field id="transmission" label={t.spec.transmission}>
              <Select id="transmission" name="transmission" defaultValue={values.transmission ?? ""}
                options={optionsFor(TOY_TRANSMISSIONS, tax)} placeholder="—" />
            </Field>

            <Field id="torqueNm" label={t.spec.torque}>
              <Num id="torqueNm" name="torqueNm" min={0} max={5000} step={1}
                defaultValue={values.torqueNm ?? ""} />
            </Field>

            <Field id="topSpeed" label={t.admin.fTopSpeedToy}>
              <Num id="topSpeed" name="topSpeed" min={0} max={600} step={1}
                defaultValue={values.topSpeed ?? ""} />
            </Field>

            {/* Only boats are routinely sold with two. */}
            {kind === "BOAT" ? (
              <Field id="engineCount" label={t.admin.fEngineCount} help={t.admin.fEngineCountHelp}>
                <Num id="engineCount" name="engineCount" min={1} max={6} step={1}
                  defaultValue={values.engineCount ?? 1} />
              </Field>
            ) : null}
          </div>
        </Panel>

        {/* ── Measurements & use ── */}
        <Panel id="measures" active={tab === "measures"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* The one figure that says how used it is. Which one it is
                depends entirely on the family, so only that one is asked. */}
            {water ? (
              <Field id="engineHours" label={t.admin.fEngineHours}>
                <Num id="engineHours" name="engineHours" min={0} max={50000} step={1}
                  defaultValue={values.engineHours ?? ""} />
              </Field>
            ) : (
              <Field id="mileage" label={t.admin.fMileageToy}>
                <Num id="mileage" name="mileage" min={0} max={999999} step={1}
                  defaultValue={values.mileage ?? ""} />
              </Field>
            )}

            <Field id="seats" label={t.admin.fSeatsToy}>
              <Num id="seats" name="seats" min={1} max={30} step={1} defaultValue={values.seats ?? ""} />
            </Field>

            <Field id="dryWeight" label={t.admin.fDryWeight}>
              <Num id="dryWeight" name="dryWeight" min={0} max={50000} step={1}
                defaultValue={values.dryWeight ?? ""} />
            </Field>

            {water ? (
              <>
                <Field id="lengthM" label={t.admin.fLength}>
                  <Num id="lengthM" name="lengthM" min={0} max={120} step={0.01}
                    defaultValue={values.lengthM ?? ""} />
                </Field>
                <Field id="beamM" label={t.admin.fBeam}>
                  <Num id="beamM" name="beamM" min={0} max={30} step={0.01}
                    defaultValue={values.beamM ?? ""} />
                </Field>
              </>
            ) : null}

            <Field id="fuelCapacity" label={t.admin.fFuelCapacity}>
              <Num id="fuelCapacity" name="fuelCapacity" min={0} max={20000} step={0.1}
                defaultValue={values.fuelCapacity ?? ""} />
            </Field>

            <Field id="rangeKm" label={t.admin.fRangeKm}>
              <Num id="rangeKm" name="rangeKm" min={0} max={10000} step={1}
                defaultValue={values.rangeKm ?? ""} />
            </Field>

            <Field id="colorExterior" label={t.spec.colorExterior}>
              <Select id="colorExterior" name="colorExterior" defaultValue={values.colorExterior ?? ""}
                options={optionsFor(COLORS, tax)} placeholder="—" />
            </Field>
          </div>
        </Panel>

        {/* ── Paperwork & condition ── */}
        <Panel id="papers" active={tab === "papers"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="licence" label={t.admin.fLicence}>
              <Select id="licence" name="licence" defaultValue={values.licence ?? ""}
                options={optionsFor(TOY_LICENCES, tax)} placeholder="—" />
            </Field>

            <Field id="firstRegistration" label={t.spec.firstRegistration}>
              <input id="firstRegistration" name="firstRegistration" type="date" className="input"
                defaultValue={values.firstRegistration ?? ""} />
            </Field>

            <Field id="previousOwners" label={t.spec.owners}>
              <Num id="previousOwners" name="previousOwners" min={0} max={50} step={1}
                defaultValue={values.previousOwners ?? ""} />
            </Field>

            <Field id="warrantyMonths" label={t.spec.warranty}>
              <Num id="warrantyMonths" name="warrantyMonths" min={0} max={120} step={1}
                defaultValue={values.warrantyMonths ?? ""} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle name="registered" label={t.admin.fRegistered} defaultChecked={values.registered ?? true} />
            <Toggle name="trailerIncluded" label={t.admin.fTrailer} defaultChecked={values.trailerIncluded} />
            <Toggle name="serviceHistory" label={t.spec.serviceHistory} defaultChecked={values.serviceHistory} />
            <Toggle name="accidentFree" label={t.spec.accidentFree} defaultChecked={values.accidentFree ?? true} />
          </div>
        </Panel>

        {/* ── Pricing ── */}
        <Panel id="pricing" active={tab === "pricing"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="price" label={t.admin.fPrice} required error={err("price")}>
              <Num id="price" name="price" required min={0} max={100000000} step={1}
                defaultValue={values.price ?? ""} />
            </Field>
            <Field id="priceNet" label={t.admin.fPriceNet}>
              <Num id="priceNet" name="priceNet" min={0} max={100000000} step={1}
                defaultValue={values.priceNet ?? ""} />
            </Field>
            <Field id="oldPrice" label={t.admin.fOldPrice}>
              <Num id="oldPrice" name="oldPrice" min={0} max={100000000} step={1}
                defaultValue={values.oldPrice ?? ""} />
            </Field>
            <Field id="financingMonthly" label={t.admin.fFinancingMonthly}>
              <Num id="financingMonthly" name="financingMonthly" min={0} max={1000000} step={1}
                defaultValue={values.financingMonthly ?? ""} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle name="vatDeductible" label={t.admin.fVatDeductible} defaultChecked={values.vatDeductible} />
            <Toggle name="negotiable" label={t.admin.fNegotiable} defaultChecked={values.negotiable} />
          </div>
        </Panel>

        {/* ── Equipment ── */}
        <Panel id="equipment" active={tab === "equipment"}>
          <p className="field-help">
            <strong className="font-semibold tabular-nums">{equipment.size}</strong>{" "}
            {t.admin.equipmentSelected}
          </p>

          <div className="space-y-5">
            {Object.keys(TOY_EQUIPMENT_GROUPS).map((group) => {
              const keys = groups[group] ?? [];
              const allOn = keys.length > 0 && keys.every((k) => equipment.has(k));
              return (
                <fieldset key={group} className="rounded-sm border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-bronze">
                      {label(TOY_EQUIPMENT_GROUPS, group, tax)}
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
                        {toyEquipmentLabel(key, tax)}
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
            <Text id="videoUrl" name="videoUrl" type="url" defaultValue={values.videoUrl ?? ""}
              maxLength={300} placeholder="https://www.youtube.com/watch?v=…" />
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
                    active ? "bg-bronze text-white" : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-fg",
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
            <Toggle name="featured" label={t.admin.toyFeatured} defaultChecked={values.featured} />
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
          cancelHref={localePath(locale, "/admin/toys")}
          draft={t.admin.saveDraft}
          more={t.admin.moreActions}
        />
      </div>
    </form>
  );
}
