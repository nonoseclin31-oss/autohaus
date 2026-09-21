"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession, getCurrentUser, logActivity } from "@/lib/auth";
import { resolveLocale } from "@/i18n";

export type SignInState = { error?: "invalid" | "inactive" | "missing" };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));

  if (!email || !password) return { error: "missing" };

  const result = await authenticate(email, password);
  if (!result.ok) return { error: result.reason };

  await createSession(result.userId);
  await logActivity(result.userId, "auth.login", "User", result.userId);
  redirect(`/${locale}/admin`);
}

export async function signOut(formData: FormData): Promise<void> {
  const locale = resolveLocale(String(formData.get("locale") ?? ""));
  const user = await getCurrentUser();
  if (user) await logActivity(user.id, "auth.logout", "User", user.id);
  await destroySession();
  redirect(`/${locale}`);
}
