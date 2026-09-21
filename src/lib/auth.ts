import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env } from "./env";

const COOKIE_NAME = "am_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  // Reading through env validates it: missing, too short, or still the
  // development placeholder all throw here rather than silently signing
  // sessions with something guessable.
  return new TextEncoder().encode(env.authSecret);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  jobTitle: string | null;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Returns the signed-in staff member, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const id = typeof payload.sub === "string" ? payload.sub : null;
    if (!id) return null;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, jobTitle: true, active: true },
    });
    if (!user || !user.active) return null;

    const { active: _active, ...session } = user;
    void _active;
    return session;
  } catch {
    return null;
  }
}

/** Authenticate by credentials. Returns the user id, or an error code. */
export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true; userId: string } | { ok: false; reason: "invalid" | "inactive" }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    // Constant-ish time: still run a hash comparison against a dummy value.
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
    return { ok: false, reason: "invalid" };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, reason: "invalid" };
  if (!user.active) return { ok: false, reason: "inactive" };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true, userId: user.id };
}

/** Write an entry to the activity log; never throws. */
export async function logActivity(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  summary?: string,
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entity, entityId: entityId ?? null, summary: summary ?? null },
    });
  } catch {
    // activity logging must never break a mutation
  }
}
