"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, logActivity } from "@/lib/auth";
import { can, ROLE_KEYS } from "@/lib/rbac";
import { toStr, toBool } from "@/lib/utils";
import { resolveLocale } from "@/i18n";

export type UserFormState = {
  status: "idle" | "error" | "success";
  message?: "forbidden" | "email-taken" | "validation" | "self-role" | "server";
};

/** Create or update a staff account. ADMIN only. */
export async function saveUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await getCurrentUser();
  if (!can(actor?.role, "user.manage")) return { status: "error", message: "forbidden" };

  const id = toStr(formData.get("id"));
  const name = toStr(formData.get("name"));
  const email = toStr(formData.get("email"))?.toLowerCase();
  const password = toStr(formData.get("password"));
  const role = toStr(formData.get("role")) ?? "VIEWER";
  const locale = resolveLocale(toStr(formData.get("locale")));

  if (!name || !email) return { status: "error", message: "validation" };
  if (!(ROLE_KEYS as readonly string[]).includes(role)) return { status: "error", message: "validation" };
  if (!id && (!password || password.length < 8)) return { status: "error", message: "validation" };

  // An administrator must not lock themselves out by demoting their own account.
  if (id && id === actor!.id && role !== actor!.role) {
    return { status: "error", message: "self-role" };
  }

  const clash = await prisma.user.findFirst({
    where: { email, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) return { status: "error", message: "email-taken" };

  const data = {
    name,
    email,
    role,
    phone: toStr(formData.get("phone")),
    jobTitle: toStr(formData.get("jobTitle")),
    // An admin must not deactivate their own account either.
    active: id && id === actor!.id ? true : toBool(formData.get("active")),
  };

  try {
    if (id) {
      await prisma.user.update({
        where: { id },
        data: { ...data, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
      });
      await logActivity(actor!.id, "user.updated", "User", id, `${name} — ${role}`);
    } else {
      const created = await prisma.user.create({
        data: { ...data, passwordHash: await hashPassword(password!) },
      });
      await logActivity(actor!.id, "user.created", "User", created.id, `${name} — ${role}`);
    }
  } catch {
    return { status: "error", message: "server" };
  }

  revalidatePath(`/${locale}/admin/users`);
  return { status: "success" };
}

export async function deleteUser(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  if (!can(actor?.role, "user.manage")) return;

  const id = String(formData.get("id") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id || id === actor!.id) return; // never delete yourself

  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true } });
  if (!target) return;

  // Keep at least one active administrator.
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) return;
  }

  await prisma.user.delete({ where: { id } });
  await logActivity(actor!.id, "user.deleted", "User", id, target.name);
  revalidatePath(`/${locale}/admin/users`);
}

/** Inline role change from the users table. */
export async function setUserRole(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  if (!can(actor?.role, "user.manage")) return;

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));

  if (!id || id === actor!.id) return;
  if (!(ROLE_KEYS as readonly string[]).includes(role)) return;

  await prisma.user.update({ where: { id }, data: { role } });
  await logActivity(actor!.id, "user.role", "User", id, role);
  revalidatePath(`/${locale}/admin/users`);
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  if (!can(actor?.role, "user.manage")) return;

  const id = String(formData.get("id") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  if (!id || id === actor!.id) return;

  const target = await prisma.user.findUnique({ where: { id }, select: { active: true, role: true } });
  if (!target) return;

  if (target.active && target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) return;
  }

  await prisma.user.update({ where: { id }, data: { active: !target.active } });
  await logActivity(actor!.id, target.active ? "user.deactivated" : "user.activated", "User", id);
  revalidatePath(`/${locale}/admin/users`);
}
