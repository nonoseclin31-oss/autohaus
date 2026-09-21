"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import { getDictionary, LOCALE_META, LOCALES, type Locale } from "@/i18n";
import { ROLES, label, type Locale as TaxLocale } from "@/lib/taxonomy";
import {
  IconUser, IconUpload, IconTrash, IconSpinner, IconCheck,
  IconAlert, IconCheckCircle, IconKey,
} from "../icons";

export type ProfileValues = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  role: string;
  locale: string;
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

export function ProfileForm({ locale, user }: { locale: Locale; user: ProfileValues }) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, { status: "idle" });

  const [avatar, setAvatar] = useState<string | null>(user.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("kind", "avatar");
      body.append("files", file);

      const response = await fetch("/api/upload", { method: "POST", body });
      if (!response.ok) throw new Error(String(response.status));

      const result = (await response.json()) as {
        uploaded: { url: string }[];
        rejected: { name: string; reason: string }[];
      };

      if (result.uploaded[0]) setAvatar(result.uploaded[0].url);
      else if (result.rejected[0]) setUploadError(`${result.rejected[0].name} (${result.rejected[0].reason})`);
    } catch {
      setUploadError(t.common.error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const errorText = {
    "email-taken": t.profile.errEmailTaken,
    "password-wrong": t.profile.errPasswordWrong,
    "password-mismatch": t.profile.errPasswordMismatch,
    "password-short": t.profile.errPasswordShort,
    "current-required": t.profile.errCurrentRequired,
    validation: t.common.error,
    server: t.common.error,
  }[state.message ?? "server"];

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="avatarUrl" value={avatar ?? ""} />

      {state.status === "success" ? (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-[3px] border border-ok/40 bg-ok-wash px-4 py-3 text-sm"
        >
          <IconCheckCircle size={17} className="mt-0.5 shrink-0 text-ok" />
          <span>
            {t.profile.saved}
            {state.passwordChanged ? ` ${t.profile.passwordChanged}` : ""}
          </span>
        </p>
      ) : null}

      {state.status === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-[3px] border border-red/40 bg-red-wash px-4 py-3 text-sm"
        >
          <IconAlert size={17} className="mt-0.5 shrink-0 text-red" />
          {errorText}
        </p>
      ) : null}

      {/* ── Photo ─────────────────────────────────────────── */}
      <section className="panel p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.1em]">{t.profile.photo}</h2>
        <p className="field-help mb-5">{t.profile.photoHint}</p>

        <div className="flex flex-wrap items-center gap-5">
          <span className="relative size-24 shrink-0 overflow-hidden rounded-full border border-line bg-surface-2">
            {avatar ? (
              <Image src={avatar} alt="" fill sizes="96px" className="object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-subtle">
                <IconUser size={34} />
              </span>
            )}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn btn-solid btn-sm cursor-pointer"
            >
              {uploading ? <IconSpinner size={14} /> : <IconUpload size={14} />}
              {uploading ? t.admin.uploading : avatar ? t.profile.replace : t.profile.upload}
            </button>

            {avatar ? (
              <button
                type="button"
                onClick={() => setAvatar(null)}
                className="btn btn-danger btn-sm cursor-pointer"
              >
                <IconTrash size={14} />
                {t.profile.removePhoto}
              </button>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
          </div>
        </div>

        {uploadError ? (
          <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-red">
            <IconAlert size={15} className="mt-0.5 shrink-0" />
            {uploadError}
          </p>
        ) : null}
      </section>

      {/* ── Personal details ──────────────────────────────── */}
      <section className="panel p-5 sm:p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.1em]">{t.profile.personal}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-name" className="label">
              {t.admin.fName} <span className="text-red">*</span>
            </label>
            <input
              id="p-name" name="name" required maxLength={120}
              defaultValue={user.name} autoComplete="name" className="input"
            />
          </div>

          <div>
            <label htmlFor="p-email" className="label">
              {t.admin.fEmail} <span className="text-red">*</span>
            </label>
            <input
              id="p-email" name="email" type="email" required maxLength={160}
              defaultValue={user.email} autoComplete="email" className="input"
            />
          </div>

          <div>
            <label htmlFor="p-phone" className="label">{t.admin.fPhone}</label>
            <input
              id="p-phone" name="phone" type="tel" maxLength={40}
              defaultValue={user.phone ?? ""} autoComplete="tel" className="input"
            />
          </div>

          <div>
            <label htmlFor="p-job" className="label">{t.admin.fJobTitle}</label>
            <input
              id="p-job" name="jobTitle" maxLength={80}
              defaultValue={user.jobTitle ?? ""} autoComplete="organization-title" className="input"
            />
          </div>

          <div>
            <label htmlFor="p-locale" className="label">{t.profile.interfaceLanguage}</label>
            <select id="p-locale" name="preferredLocale" defaultValue={user.locale} className="select">
              {LOCALES.map((code) => (
                <option key={code} value={code}>{LOCALE_META[code].name}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="label">{t.admin.fRole}</span>
            <p className="flex min-h-[44px] items-center gap-2.5 rounded-[2px] border border-line bg-surface-2 px-3">
              <span className="chip">{label(ROLES, user.role, tax)}</span>
            </p>
            <p className="field-help">{t.profile.roleLocked}</p>
          </div>
        </div>
      </section>

      {/* ── Password ──────────────────────────────────────── */}
      <section className="panel p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.1em]">
          <IconKey size={15} className="text-red" />
          {t.profile.security}
        </h2>
        <p className="field-help mb-5">{t.profile.securityHint}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="p-current" className="label">{t.profile.currentPassword}</label>
            <input
              id="p-current" name="currentPassword" type="password" maxLength={100}
              autoComplete="current-password" className="input"
            />
          </div>
          <div>
            <label htmlFor="p-new" className="label">{t.profile.newPassword}</label>
            <input
              id="p-new" name="newPassword" type="password" minLength={8} maxLength={100}
              autoComplete="new-password" className="input"
            />
            <p className="field-help">{t.profile.passwordHint}</p>
          </div>
          <div>
            <label htmlFor="p-confirm" className="label">{t.profile.confirmPassword}</label>
            <input
              id="p-confirm" name="confirmPassword" type="password" minLength={8} maxLength={100}
              autoComplete="new-password" className="input"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Submit idle={t.common.save} busy={t.common.saving} />
      </div>
    </form>
  );
}
