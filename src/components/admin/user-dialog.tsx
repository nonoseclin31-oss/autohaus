"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveUser, type UserFormState } from "@/app/actions/users";
import { getDictionary, type Locale } from "@/i18n";
import { ROLES, label, optionsFor, type Locale as TaxLocale } from "@/lib/taxonomy";
import { IconPlus, IconX, IconAlert, IconSpinner, IconCheck, IconEdit } from "../icons";

export type EditableUser = {
  id: string; name: string; email: string; role: string;
  phone: string | null; jobTitle: string | null; active: boolean;
};

function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary cursor-pointer" disabled={pending}>
      {pending ? <IconSpinner size={16} /> : <IconCheck size={16} />}
      {pending ? busy : idle}
    </button>
  );
}

export function UserDialog({
  locale,
  user,
  trigger = "button",
}: {
  locale: Locale;
  user?: EditableUser;
  trigger?: "button" | "icon";
}) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<UserFormState, FormData>(saveUser, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state.status]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const errorText =
    state.message === "email-taken"
      ? `${t.forms.email}: ${t.common.error}`
      : state.message === "password-short"
        ? t.profile.errPasswordShort
        : state.message === "self-role"
          ? t.admin.cannotEditSelfRole
          : state.message === "forbidden"
            ? t.admin.permDenied
            : state.status === "error"
              ? t.common.error
              : null;

  return (
    <>
      {trigger === "button" ? (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-primary cursor-pointer">
          <IconPlus size={17} />
          {t.admin.addUser}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.common.edit}
          title={t.common.edit}
          className="cursor-pointer rounded-sm p-2 text-muted transition-colors duration-200 hover:bg-surface-3 hover:text-fg"
        >
          <IconEdit size={16} />
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button
            type="button"
            aria-label={t.common.close}
            onClick={() => setOpen(false)}
            className="fixed inset-0 cursor-pointer bg-ink/35 backdrop-blur-sm animate-fade"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-dialog-title"
            className="relative my-auto w-full max-w-lg rounded-sm border border-line bg-surface shadow-[var(--shadow-lg)] animate-rise"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id="user-dialog-title" className="text-base font-semibold">
                {user ? t.admin.editUser : t.admin.newUser}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="cursor-pointer rounded-sm p-2 text-muted transition-colors duration-200 hover:text-fg"
              >
                <IconX size={19} />
              </button>
            </header>

            <form action={action} className="space-y-4 p-5">
              {user ? <input type="hidden" name="id" value={user.id} /> : null}
              <input type="hidden" name="locale" value={locale} />

              {errorText ? (
                <p role="alert" className="flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-3 py-2.5 text-sm">
                  <IconAlert size={15} className="mt-0.5 shrink-0 text-red" />
                  {errorText}
                </p>
              ) : null}

              <div>
                <label htmlFor="u-name" className="label">
                  {t.admin.fName} <span className="text-red">*</span>
                </label>
                <input id="u-name" name="name" required maxLength={120} defaultValue={user?.name ?? ""} className="input" />
              </div>

              <div>
                <label htmlFor="u-email" className="label">
                  {t.admin.fEmail} <span className="text-red">*</span>
                </label>
                <input
                  id="u-email" name="email" type="email" required maxLength={160}
                  defaultValue={user?.email ?? ""} className="input" autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="u-password" className="label">
                  {t.admin.fPassword} {user ? null : <span className="text-red">*</span>}
                </label>
                <input
                  id="u-password" name="password" type="password" minLength={8} maxLength={100}
                  required={!user} className="input" autoComplete="new-password"
                />
                <p className="field-help">{user ? t.admin.fPasswordHelpEdit : "min. 8"}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="u-job" className="label">{t.admin.fJobTitle}</label>
                  <input id="u-job" name="jobTitle" maxLength={80} defaultValue={user?.jobTitle ?? ""} className="input" />
                </div>
                <div>
                  <label htmlFor="u-phone" className="label">{t.admin.fPhone}</label>
                  <input id="u-phone" name="phone" type="tel" maxLength={40} defaultValue={user?.phone ?? ""} className="input" />
                </div>
              </div>

              <div>
                <label htmlFor="u-role" className="label">
                  {t.admin.fRole} <span className="text-red">*</span>
                </label>
                <select id="u-role" name="role" defaultValue={user?.role ?? "SALES"} className="select">
                  {optionsFor(ROLES, tax).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="field-help">{t.admin.roleHelp}</p>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-line bg-surface-2 p-3 text-sm">
                <input
                  type="checkbox" name="active" defaultChecked={user?.active ?? true}
                  className="size-4 cursor-pointer accent-[var(--color-red)]"
                />
                {t.admin.fActive}
              </label>

              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost cursor-pointer">
                  {t.common.cancel}
                </button>
                <Submit idle={t.common.save} busy={t.common.saving} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Small read-only legend describing what each role may do. */
export function RoleLegend({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const rows = [
    { role: "ADMIN", desc: t.roles.adminDesc },
    { role: "MANAGER", desc: t.roles.managerDesc },
    { role: "SALES", desc: t.roles.salesDesc },
    { role: "VIEWER", desc: t.roles.viewerDesc },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((row) => (
        <div key={row.role} className="rounded-sm border border-line bg-surface p-3.5">
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-bronze">
            {label(ROLES, row.role, tax)}
          </dt>
          <dd className="mt-1 text-xs leading-relaxed text-muted">{row.desc}</dd>
        </div>
      ))}
    </dl>
  );
}
