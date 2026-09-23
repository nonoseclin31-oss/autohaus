"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { EDITABLE_KEYS, settingKey, type EditableKey } from "@/lib/company";
import {
  ABOUT_TEXTS, ABOUT_TEXT_MAX, HEADER_PHONE_KEY, aboutTextKey,
} from "@/lib/site-settings";
import { LOCALES } from "@/lib/taxonomy";
import { toBool, toStr } from "@/lib/utils";
import { getDictionary, resolveLocale } from "@/i18n";

export type SettingsState = {
  status: "idle" | "error" | "success";
  message?: "forbidden" | "validation" | "server";
  fieldErrors?: Record<string, string>;
};

/** How long each field may be, and which must not be left blank. */
const RULES: Record<EditableKey, { max: number; required: boolean }> = {
  email: { max: 160, required: true },
  phone: { max: 40, required: true },
  street: { max: 120, required: true },
  postalCode: { max: 20, required: true },
  city: { max: 80, required: true },
  country: { max: 80, required: true },
  // Legally required on the Impressum, but a company may not have them all on
  // day one — so they are allowed to be blank and the page says what is
  // missing rather than inventing it.
  registerCourt: { max: 120, required: false },
  registerNumber: { max: 40, required: false },
  managingDirector: { max: 160, required: false },
  vatId: { max: 40, required: false },
};

export async function saveCompanySettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await getCurrentUser();
  if (!can(user?.role, "settings.manage")) return { status: "error", message: "forbidden" };

  const locale = resolveLocale(toStr(formData.get("locale")));
  const values: Partial<Record<EditableKey, string>> = {};
  const fieldErrors: Record<string, string> = {};

  for (const key of EDITABLE_KEYS) {
    const value = (toStr(formData.get(key)) ?? "").trim();
    const rule = RULES[key];
    if (rule.required && !value) fieldErrors[key] = "required";
    else if (value.length > rule.max) fieldErrors[key] = "too-long";
    values[key] = value;
  }

  // These appear on every page and in the structured data; a malformed address
  // is worse than the default one.
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    fieldErrors.email = "invalid";
  }
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "validation", fieldErrors };
  }

  // A checkbox sends nothing when it is unticked, so absence means "hide".
  const headerPhone = toBool(formData.get("headerPhone")) ? "1" : "0";

  try {
    await Promise.all([
      ...EDITABLE_KEYS.map((key) =>
        prisma.setting.upsert({
          where: { key: settingKey(key) },
          create: { key: settingKey(key), value: values[key] ?? "" },
          update: { value: values[key] ?? "" },
        }),
      ),
      prisma.setting.upsert({
        where: { key: HEADER_PHONE_KEY },
        create: { key: HEADER_PHONE_KEY, value: headerPhone },
        update: { value: headerPhone },
      }),
    ]);
    await logActivity(user!.id, "settings.updated", "Setting", null, `${values.city} · ${values.phone}`);
  } catch {
    return { status: "error", message: "server" };
  }

  // The details sit in the header, the footer, the contact page, the legal
  // pages and the structured data, so everything public has to be rebuilt.
  revalidatePath("/", "layout");
  revalidatePath(`/${locale}/admin/settings`);
  return { status: "success" };
}

/* ─────────────── The About page's presentation paragraphs ─────────────── */

export type AboutTextsState = {
  status: "idle" | "error" | "success";
  message?: "forbidden" | "too-long" | "server";
};

/**
 * The two paragraphs that present the company on the About page, in each
 * language. Administrators only — the same permission as the company details.
 *
 * Only a text that differs from the original is stored. A field emptied, or
 * put back to the original wording, removes the stored copy, so the page
 * returns to the text the site ships with — and picks up any later
 * correction of it — rather than freezing an old copy of the default.
 */
export async function saveAboutTexts(
  _prev: AboutTextsState,
  formData: FormData,
): Promise<AboutTextsState> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "settings.manage")) return { status: "error", message: "forbidden" };

  const locale = resolveLocale(toStr(formData.get("locale")));
  const writes: { key: string; value: string | null }[] = [];

  for (const loc of LOCALES) {
    const original = getDictionary(loc).about;
    for (const text of ABOUT_TEXTS) {
      const raw = formData.get(`${text}:${loc}`);
      if (raw === null) continue;
      // Paragraph breaks are kept; runs of spaces and stray blank lines are not.
      const value = String(raw).replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (value.length > ABOUT_TEXT_MAX) return { status: "error", message: "too-long" };
      writes.push({ key: aboutTextKey(text, loc), value: value && value !== original[text].trim() ? value : null });
    }
  }

  try {
    await Promise.all(
      writes.map(({ key, value }) =>
        value === null
          ? prisma.setting.deleteMany({ where: { key } })
          : prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
      ),
    );
    const changed = writes.filter((w) => w.value !== null).length;
    await logActivity(user.id, "settings.updated", "Setting", null, `About page: ${changed} rewritten paragraph(s)`);
  } catch {
    return { status: "error", message: "server" };
  }

  for (const loc of LOCALES) revalidatePath(`/${loc}/about`);
  revalidatePath(`/${locale}/admin/settings`);
  return { status: "success" };
}
