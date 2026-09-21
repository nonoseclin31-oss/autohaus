"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCompanySettings, type SettingsState } from "@/app/actions/settings";
import { getDictionary, type Locale } from "@/i18n";
import { IconCheck, IconSpinner, IconAlert, IconInfo } from "@/components/icons";

/**
 * The contact details shown across the public site.
 *
 * They live in Setting rather than in the code so the showroom can correct a
 * phone number or an address the day it changes, without a deploy.
 */
export function CompanySettingsForm({
  locale,
  values,
}: {
  locale: Locale;
  values: Record<
    | "email" | "phone" | "street" | "postalCode" | "city" | "country"
    | "registerCourt" | "registerNumber" | "managingDirector" | "vatId",
    string
  >;
}) {
  const t = getDictionary(locale);
  const [state, action] = useActionState<SettingsState, FormData>(saveCompanySettings, { status: "idle" });

  const err = (field: string) =>
    state.fieldErrors?.[field]
      ? state.fieldErrors[field] === "invalid"
        ? t.admin.settingsInvalidEmail
        : t.common.required
      : undefined;

  return (
    <form action={action} className="max-w-2xl space-y-6">
      <input type="hidden" name="locale" value={locale} />

      {state.status === "success" ? (
        <p role="status" className="flex items-center gap-2 rounded-sm border border-ok/40 bg-ok-wash px-4 py-3 text-sm">
          <IconCheck size={16} className="shrink-0 text-ok" />
          {t.common.success}
        </p>
      ) : null}

      {state.status === "error" ? (
        <p role="alert" className="flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-4 py-3 text-sm">
          <IconAlert size={16} className="mt-0.5 shrink-0 text-red" />
          {state.message === "forbidden" ? t.admin.permDenied : t.common.error}
        </p>
      ) : null}

      <section className="space-y-4 rounded-sm border border-line bg-surface p-5">
        <h2 className="text-base font-semibold">{t.admin.settingsContact}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="s-email" label={t.contact.email} error={err("email")}>
            <input id="s-email" name="email" type="email" defaultValue={values.email}
              maxLength={160} required className="input" />
          </Field>
          <Field id="s-phone" label={t.contact.phone} error={err("phone")}>
            <input id="s-phone" name="phone" type="tel" defaultValue={values.phone}
              maxLength={40} required className="input" />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-sm border border-line bg-surface p-5">
        <h2 className="text-base font-semibold">{t.contact.address}</h2>
        <p className="field-help !mt-0">{t.admin.settingsAddressHelp}</p>

        <Field id="s-street" label={t.admin.settingsStreet} error={err("street")}>
          <input id="s-street" name="street" defaultValue={values.street}
            maxLength={120} required className="input" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Field id="s-postal" label={t.admin.settingsPostalCode} error={err("postalCode")}>
            <input id="s-postal" name="postalCode" defaultValue={values.postalCode}
              maxLength={20} required className="input" />
          </Field>
          <Field id="s-city" label={t.admin.settingsCity} error={err("city")}>
            <input id="s-city" name="city" defaultValue={values.city}
              maxLength={80} required className="input" />
          </Field>
        </div>

        <Field id="s-country" label={t.admin.settingsCountry} error={err("country")}>
          <input id="s-country" name="country" defaultValue={values.country}
            maxLength={80} required className="input" />
        </Field>
      </section>

      <section className="space-y-4 rounded-sm border border-line bg-surface p-5">
        <h2 className="text-base font-semibold">{t.admin.settingsLegal}</h2>
        <p className="field-help !mt-0">{t.admin.settingsLegalHelp}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="s-court" label={t.admin.settingsRegisterCourt}>
            <input id="s-court" name="registerCourt" defaultValue={values.registerCourt}
              maxLength={120} className="input" placeholder="Amtsgericht …" />
          </Field>
          <Field id="s-hrb" label={t.admin.settingsRegisterNumber}>
            <input id="s-hrb" name="registerNumber" defaultValue={values.registerNumber}
              maxLength={40} className="input" placeholder="HRB …" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="s-gf" label={t.admin.settingsManagingDirector}>
            <input id="s-gf" name="managingDirector" defaultValue={values.managingDirector}
              maxLength={160} className="input" />
          </Field>
          <Field id="s-vat" label={t.admin.settingsVatId}>
            <input id="s-vat" name="vatId" defaultValue={values.vatId}
              maxLength={40} className="input" placeholder="DE…" />
          </Field>
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
        <IconInfo size={14} className="mt-0.5 shrink-0" />
        {t.admin.settingsWhere}
      </p>

      <SaveButton idle={t.common.save} busy={t.common.saving} />
    </form>
  );
}

function Field({
  id, label, error, children,
}: {
  id: string; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error ? <p className="field-help text-red">{error}</p> : null}
    </div>
  );
}

function SaveButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary cursor-pointer" disabled={pending}>
      {pending ? <IconSpinner size={17} /> : <IconCheck size={17} />}
      {pending ? busy : idle}
    </button>
  );
}
