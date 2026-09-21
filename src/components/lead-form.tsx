"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitLead, type LeadFormState } from "@/app/actions/leads";
import { getDictionary, type Locale } from "@/i18n";
import { IconCheckCircle, IconAlert, IconSpinner, IconArrowRight } from "./icons";

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full cursor-pointer" disabled={pending}>
      {pending ? <IconSpinner size={17} /> : <IconArrowRight size={17} />}
      {pending ? busy : idle}
    </button>
  );
}

export function LeadForm({
  locale,
  type = "CONTACT",
  vehicleId,
  vehicleLabel,
  rentalDuration,
  rentalMileage,
  compact = false,
}: {
  locale: Locale;
  type?: "SALE" | "RENTAL" | "CONTACT" | "TRADE_IN";
  vehicleId?: string;
  vehicleLabel?: string;
  rentalDuration?: number;
  rentalMileage?: number;
  compact?: boolean;
}) {
  const t = getDictionary(locale);
  const [state, action] = useActionState<LeadFormState, FormData>(submitLead, { status: "idle" });

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-sm border border-ok/40 bg-ok/10 px-6 py-10 text-center">
        <IconCheckCircle size={36} className="text-ok" />
        <h3 className="text-lg font-semibold">{t.forms.successTitle}</h3>
        <p className="max-w-sm text-sm text-muted">{t.forms.successBody}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="locale" value={locale} />
      {vehicleId ? <input type="hidden" name="vehicleId" value={vehicleId} /> : null}
      {rentalDuration ? <input type="hidden" name="rentalDuration" value={rentalDuration} /> : null}
      {rentalMileage ? <input type="hidden" name="rentalMileage" value={rentalMileage} /> : null}

      {vehicleLabel ? (
        <p className="rounded-sm border border-line bg-surface-2 px-3 py-2 text-sm">
          <span className="text-subtle">{t.forms.interestedIn}: </span>
          <strong className="text-fg">{vehicleLabel}</strong>
        </p>
      ) : null}

      {state.status === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-3 py-2.5 text-sm text-fg"
        >
          <IconAlert size={16} className="mt-0.5 shrink-0 text-red" />
          {t.forms.errorTitle}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lf-first" className="label">
            {t.forms.firstName} <span className="text-red">*</span>
          </label>
          <input id="lf-first" name="firstName" required maxLength={80} autoComplete="given-name" className="input" />
        </div>
        <div>
          <label htmlFor="lf-last" className="label">
            {t.forms.lastName} <span className="text-red">*</span>
          </label>
          <input id="lf-last" name="lastName" required maxLength={80} autoComplete="family-name" className="input" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lf-email" className="label">
            {t.forms.email} <span className="text-red">*</span>
          </label>
          <input id="lf-email" name="email" type="email" required maxLength={160} autoComplete="email" className="input" />
        </div>
        <div>
          <label htmlFor="lf-phone" className="label">
            {t.forms.phone} <span className="text-subtle normal-case">({t.common.optional})</span>
          </label>
          <input id="lf-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" className="input" />
        </div>
      </div>

      {!compact ? (
        <div>
          <label htmlFor="lf-company" className="label">
            {t.forms.company} <span className="text-subtle normal-case">({t.common.optional})</span>
          </label>
          <input id="lf-company" name="company" maxLength={120} autoComplete="organization" className="input" />
        </div>
      ) : null}

      <div>
        <label htmlFor="lf-message" className="label">{t.forms.message}</label>
        <textarea
          id="lf-message"
          name="message"
          maxLength={4000}
          rows={compact ? 3 : 5}
          placeholder={t.forms.messagePlaceholder}
          className="textarea"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" required className="mt-1 size-4 cursor-pointer accent-[var(--color-red)]" />
        <span>{t.forms.consent}</span>
      </label>

      <SubmitButton idle={t.cta.sendRequest} busy={t.forms.sending} />
    </form>
  );
}
