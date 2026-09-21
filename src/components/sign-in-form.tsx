"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type SignInState } from "@/app/actions/auth";
import { getDictionary, type Locale } from "@/i18n";
import { IconAlert, IconSpinner, IconKey, IconEye, IconEyeOff } from "./icons";

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full cursor-pointer" disabled={pending}>
      {pending ? <IconSpinner size={17} /> : <IconKey size={17} />}
      {pending ? busy : idle}
    </button>
  );
}

export function SignInForm({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const [state, action] = useActionState<SignInState, FormData>(signIn, {});
  const [reveal, setReveal] = useState(false);

  const message =
    state.error === "inactive" ? t.auth.inactive : state.error ? t.auth.invalid : null;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {message ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-3 py-2.5 text-sm text-fg"
        >
          <IconAlert size={16} className="mt-0.5 shrink-0 text-red" />
          {message}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className="label">{t.auth.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="input"
          placeholder="advisor@autohaus-motion.de"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">{t.auth.password}</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={reveal ? "text" : "password"}
            required
            autoComplete="current-password"
            className="input pe-11"
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? t.auth.hidePassword : t.auth.showPassword}
            aria-pressed={reveal}
            className="absolute end-1 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-2 text-subtle transition-colors duration-200 hover:text-fg"
          >
            {reveal ? <IconEyeOff size={17} /> : <IconEye size={17} />}
          </button>
        </div>
      </div>

      <Submit idle={t.auth.submit} busy={t.auth.signingIn} />
    </form>
  );
}
