"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession, getCurrentUser, logActivity } from "@/lib/auth";
import { resolveLocale } from "@/i18n";
import { clientFingerprint, recordFailedSignIn, signInLocked } from "@/lib/throttle";

export type SignInState = { error?: "invalid" | "inactive" | "missing" | "locked" };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));

  if (!email || !password) return { error: "missing" };

  // Unlimited tries would make any password guessable in the end. After five
  // wrong ones on an account, or twenty from one connection, sign-in pauses
  // for a quarter of an hour — checked before the password is compared, so a
  // guesser learns nothing from the attempts past the limit.
  const account = email.toLowerCase().slice(0, 160);
  const fingerprint = await clientFingerprint();
  if (await signInLocked(account, fingerprint)) return { error: "locked" };

  const result = await authenticate(email, password);
  if (!result.ok) {
    if (result.reason === "invalid") await recordFailedSignIn(account, fingerprint);
    return { error: result.reason };
  }

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
