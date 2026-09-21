"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logActivity } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { EDITABLE_KEYS, settingKey, type EditableKey } from "@/lib/company";
import { toStr } from "@/lib/utils";
import { resolveLocale } from "@/i18n";

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

  try {
    await Promise.all(
      EDITABLE_KEYS.map((key) =>
        prisma.setting.upsert({
          where: { key: settingKey(key) },
          create: { key: settingKey(key), value: values[key] ?? "" },
          update: { value: values[key] ?? "" },
        }),
      ),
    );
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
