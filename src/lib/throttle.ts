import { headers } from "next/headers";
import { prisma } from "./prisma";
import { env } from "./env";

/**
 * Brakes on the two doors the public can knock on without an account: the
 * sign-in form and the enquiry forms.
 *
 * Workers keep no memory between requests, so the counting is done in the
 * activity log the back office already keeps — which also means a burst of
 * failed sign-ins shows up in the journal, where an administrator can see it.
 */

const WINDOW_MS = 15 * 60 * 1000;

/** Wrong passwords allowed on one account before it is paused. */
const MAX_FAILURES_PER_ACCOUNT = 5;
/** Wrong passwords allowed from one connection, whatever the accounts tried. */
const MAX_FAILURES_PER_ADDRESS = 20;

/**
 * The visitor's connection, as a pseudonym.
 *
 * Cloudflare hands the real address to the Worker; it is never stored as
 * such, only as a keyed hash of it — enough to recognise the same source
 * twice within a quarter of an hour, and useless for anything else.
 */
export async function clientFingerprint(): Promise<string | null> {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  if (!ip) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${env.authSecret}:${ip}`),
  );
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const since = () => new Date(Date.now() - WINDOW_MS);

/**
 * Whether sign-in is paused for this account or this connection.
 *
 * Checked before the password is even compared: a guesser who has used up
 * the allowance learns nothing more from the next try, right or wrong.
 */
export async function signInLocked(email: string, fingerprint: string | null): Promise<boolean> {
  const [byAccount, byAddress] = await Promise.all([
    prisma.activityLog.count({
      where: { action: "auth.failed", summary: email, createdAt: { gte: since() } },
    }),
    fingerprint
      ? prisma.activityLog.count({
          where: { action: "auth.failed", entityId: fingerprint, createdAt: { gte: since() } },
        })
      : Promise.resolve(0),
  ]);
  return byAccount >= MAX_FAILURES_PER_ACCOUNT || byAddress >= MAX_FAILURES_PER_ADDRESS;
}

export async function recordFailedSignIn(email: string, fingerprint: string | null): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId: null, action: "auth.failed", entity: "Login", entityId: fingerprint, summary: email },
    });
  } catch {
    // Logging must never be the reason a sign-in page errors.
  }
}

/** Enquiries accepted from one connection per quarter of an hour. */
const MAX_LEADS_PER_ADDRESS = 8;

/**
 * Whether this connection has already sent more enquiries than a person
 * plausibly would — counted on the enquiries themselves, by the same
 * pseudonym, so the journal is not filled with bookkeeping.
 */
export async function leadFlood(fingerprint: string | null): Promise<boolean> {
  if (!fingerprint) return false;
  const recent = await prisma.lead.count({
    where: { sourceHash: fingerprint, createdAt: { gte: since() } },
  });
  return recent >= MAX_LEADS_PER_ADDRESS;
}
