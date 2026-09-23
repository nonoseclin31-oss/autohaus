"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentUser, hashPassword, logActivity } from "@/lib/auth";
import { can, ROLE_KEYS } from "@/lib/rbac";
import { toStr, toBool } from "@/lib/utils";
import { resolveLocale } from "@/i18n";
import { LOCALES } from "@/lib/taxonomy";
import { readBirthDate, ROLE_MAX, TAGLINE_MAX, type AboutCopy } from "@/lib/team-copy";

export type UserFormState = {
  status: "idle" | "error" | "success";
  message?: "forbidden" | "email-taken" | "validation" | "password-short" | "self-role" | "server";
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
  // A new account needs a password; an existing one only when it is being
  // changed. Either way it has to clear the same bar — the length check used
  // to apply on creation only, so an edit could set a one-character password.
  if (!id && !password) return { status: "error", message: "validation" };
  if (password && password.length < 8) return { status: "error", message: "password-short" };

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
        data: {
          ...data,
          // Stamping the change invalidates every session token issued before
          // it, so resetting a password actually turns out whoever was signed
          // in with the old one.
          ...(password
            ? { passwordHash: await hashPassword(password), passwordChangedAt: new Date() }
            : {}),
        },
      });
      await logActivity(actor!.id, "user.updated", "User", id, `${name} — ${role}`);
      if (password) {
        await logActivity(actor!.id, "user.password.reset", "User", id, name);
        // An admin resetting their own password would otherwise sign themselves
        // out on the next request.
        if (id === actor!.id) await createSession(id);
      }
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

/* ─────────────────── The team on the About page ─────────────────── */

export type TeamState = { status: "idle" | "saved" | "error" };

/**
 * Who appears on the About page, in which order, and what is said of them.
 * ADMIN only — the same permission that creates and removes accounts, since
 * putting a colleague's face and age on the public site is a decision about
 * that colleague, not about the catalogue.
 *
 * The order is rewritten whole, as for the catalogue: anyone not on the form
 * leaves the page. A profile's birth date and texts are only touched when the
 * form carried them — hiding someone keeps what was written about them, so
 * showing them again later does not mean writing it all again.
 */
export async function saveAboutTeam(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.role, "user.manage")) return { status: "error" };

  const locale = resolveLocale(toStr(formData.get("locale")));

  const eligible = new Set(
    (await prisma.user.findMany({ where: { active: true }, select: { id: true } })).map((row) => row.id),
  );

  const order: string[] = [];
  for (const raw of formData.getAll("shown")) {
    const id = String(raw);
    if (!eligible.has(id) || order.includes(id)) continue;
    order.push(id);
  }

  const profiles = new Map<string, { birthDate?: Date | null; aboutCopy?: string }>();
  for (const id of order) {
    const birthDate = readBirthDate(formData.get(`birthDate:${id}`));

    let carried = false;
    const copy: AboutCopy = {};
    for (const loc of LOCALES) {
      const role = formData.get(`role:${id}:${loc}`);
      const tagline = formData.get(`tagline:${id}:${loc}`);
      if (role !== null || tagline !== null) carried = true;
      const entry = {
        ...(role !== null && String(role).trim() ? { role: String(role).trim().slice(0, ROLE_MAX) } : {}),
        ...(tagline !== null && String(tagline).trim()
          ? { tagline: String(tagline).trim().replace(/\s+/g, " ").slice(0, TAGLINE_MAX) }
          : {}),
      };
      if (entry.role || entry.tagline) copy[loc] = entry;
    }

    profiles.set(id, {
      ...(birthDate !== undefined ? { birthDate } : {}),
      ...(carried ? { aboutCopy: JSON.stringify(copy) } : {}),
    });
  }

  await prisma.$transaction([
    prisma.user.updateMany({ where: { aboutRank: { not: null } }, data: { aboutRank: null } }),
    ...order.map((id, index) =>
      prisma.user.update({ where: { id }, data: { aboutRank: index + 1, ...profiles.get(id) } }),
    ),
  ]);

  await logActivity(
    actor.id,
    "update",
    "about",
    null,
    `${order.length} ${order.length === 1 ? "person" : "people"} shown on the About page`,
  );

  revalidatePath(`/${locale}/admin/users/team`);
  for (const loc of LOCALES) revalidatePath(`/${loc}/about`);
  return { status: "saved" };
}
