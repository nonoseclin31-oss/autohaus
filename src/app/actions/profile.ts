"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentUser, hashPassword, verifyPassword, logActivity } from "@/lib/auth";
import { toStr } from "@/lib/utils";
import { resolveLocale, isLocale } from "@/i18n";
import { isStoredImageUrl } from "@/lib/storage";

/**
 * Self-service profile editing. Available to every signed-in staff member
 * regardless of role — it only ever touches the caller's own record, and it
 * cannot change a role or the active flag (those stay with an administrator).
 */

export type ProfileState = {
  status: "idle" | "success" | "error";
  message?:
    | "email-taken"
    | "password-wrong"
    | "password-mismatch"
    | "password-short"
    | "current-required"
    | "validation"
    | "server";
  passwordChanged?: boolean;
};

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const actor = await getCurrentUser();
  if (!actor) return { status: "error", message: "server" };

  const name = toStr(formData.get("name"));
  const email = toStr(formData.get("email"))?.toLowerCase();
  const phone = toStr(formData.get("phone"));
  const jobTitle = toStr(formData.get("jobTitle"));
  // Only a photo that went through our own upload: a pasted link to another
  // site would be shown on the public team page as if it were ours.
  const avatarInput = toStr(formData.get("avatarUrl"));
  const avatarUrl = avatarInput && isStoredImageUrl(avatarInput) ? avatarInput : null;
  const localeInput = toStr(formData.get("preferredLocale"));
  const uiLocale = resolveLocale(toStr(formData.get("locale")));

  if (!name || !email) return { status: "error", message: "validation" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "validation" };

  const currentPassword = toStr(formData.get("currentPassword"));
  const newPassword = toStr(formData.get("newPassword"));
  const confirmPassword = toStr(formData.get("confirmPassword"));

  // ── Password change is optional, but all-or-nothing ──────
  let passwordHash: string | undefined;
  if (newPassword || confirmPassword) {
    if (!currentPassword) return { status: "error", message: "current-required" };
    if (newPassword !== confirmPassword) return { status: "error", message: "password-mismatch" };
    if (!newPassword || newPassword.length < 8) return { status: "error", message: "password-short" };

    const record = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true },
    });
    if (!record) return { status: "error", message: "server" };

    const valid = await verifyPassword(currentPassword, record.passwordHash);
    if (!valid) return { status: "error", message: "password-wrong" };

    passwordHash = await hashPassword(newPassword);
  }

  // ── Email must stay unique ───────────────────────────────
  const clash = await prisma.user.findFirst({
    where: { email, NOT: { id: actor.id } },
    select: { id: true },
  });
  if (clash) return { status: "error", message: "email-taken" };

  try {
    await prisma.user.update({
      where: { id: actor.id },
      data: {
        name,
        email,
        phone,
        jobTitle,
        avatarUrl,
        ...(isLocale(localeInput) ? { locale: localeInput } : {}),
        // Same stamp as an admin reset: changing your own password should
        // sign out anyone else holding a session on your account.
        ...(passwordHash ? { passwordHash, passwordChangedAt: new Date() } : {}),
      },
    });
  } catch {
    return { status: "error", message: "server" };
  }

  // The stamp above invalidates every token issued before now, including the
  // one this request arrived with, so mint a fresh session for the browser
  // that just changed it.
  if (passwordHash) await createSession(actor.id);

  await logActivity(
    actor.id,
    passwordHash ? "profile.updated.password" : "profile.updated",
    "User",
    actor.id,
    name,
  );

  revalidatePath(`/${uiLocale}/admin/profile`);
  revalidatePath(`/${uiLocale}/admin`, "layout");

  return { status: "success", passwordChanged: !!passwordHash };
}
