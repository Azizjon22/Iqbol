import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { StaffRole, WorkerPosition } from "@iqbol/shared";

/**
 * Two cookies, one per place the app runs, never the same name twice:
 * - WEB_COOKIE: the site in a browser (SameSite=Lax);
 * - TG_COOKIE: the Telegram mini app, which may sit in Telegram Web's
 *   iframe where only a SameSite=None, Secure, partitioned cookie survives.
 * One name for both used to leave two same-named cookies in one jar (the
 * browser sends both, the server read the older), so one person's sign-in
 * could open another's session. Every write sets one and expires the other;
 * if both still arrive, the newer sign-in wins.
 */
export const WEB_COOKIE = "iqbol_web";
export const TG_COOKIE = "iqbol_tg";
/** The single cookie of earlier versions: never read, expired when seen. */
const LEGACY_COOKIE = "iqbol_session";

type StaffSessionUser = {
  kind: "STAFF";
  id: string;
  fullName: string;
  phone: string;
  role: StaffRole;
  mustChangePassword: boolean;
};

type WorkerSessionUser = {
  kind: "WORKER";
  id: string;
  fullName: string;
  phone: string;
  position: WorkerPosition;
  mustChangePin: boolean;
};

export type SessionUser = StaffSessionUser | WorkerSessionUser;

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  /** Signed in from the Telegram mini app, which may run inside an iframe. */
  telegram?: boolean;
  /** When this person signed in (ms) — kept through token refreshes. */
  signedInAt?: number;
}

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  // The example value is public: with it anyone could mint a session cookie.
  if (process.env.NODE_ENV === "production" && (secret.startsWith("change-me") || secret.length < 32)) {
    throw new Error("SESSION_SECRET productionda haqiqiy, tasodifiy qiymat bo'lishi kerak: openssl rand -base64 32");
  }
  return new TextEncoder().encode(secret);
}

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days, matches refresh token TTL

export async function encryptSession(data: SessionData): Promise<string> {
  // A decoded session carries the old token's iat/exp; the new ones are set below.
  const claims: Record<string, unknown> = { ...data };
  delete claims.iat;
  delete claims.exp;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function decryptSession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

const WEB_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
const TG_OPTIONS = { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" };

/** What both `cookies()` and `NextResponse#cookies` offer for writing. */
interface CookieJar {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
  delete(options: { name: string } & Record<string, unknown>): unknown;
}

/** Writes the session into the cookie for where it was signed in, and expires the other one. */
export async function writeSession(jar: CookieJar, data: SessionData) {
  const token = await encryptSession({ ...data, signedInAt: data.signedInAt ?? Date.now() });
  if (data.telegram) {
    jar.set(TG_COOKIE, token, { ...TG_OPTIONS, maxAge: MAX_AGE_SECONDS });
    jar.delete({ name: WEB_COOKIE, ...WEB_OPTIONS });
  } else {
    jar.set(WEB_COOKIE, token, { ...WEB_OPTIONS, maxAge: MAX_AGE_SECONDS });
    jar.delete({ name: TG_COOKIE, ...TG_OPTIONS });
  }
  jar.delete({ name: LEGACY_COOKIE, ...WEB_OPTIONS });
}

/** Signs out everywhere this browser holds a session. */
export function clearSessionCookies(jar: CookieJar) {
  jar.delete({ name: WEB_COOKIE, ...WEB_OPTIONS });
  jar.delete({ name: TG_COOKIE, ...TG_OPTIONS });
  jar.delete({ name: LEGACY_COOKIE, ...WEB_OPTIONS });
}

/** The current session from whichever cookies arrived — the newer one if both did. */
export async function readSession(get: (name: string) => string | undefined): Promise<SessionData | null> {
  const [web, tg] = await Promise.all(
    [WEB_COOKIE, TG_COOKIE].map((name) => {
      const token = get(name);
      return token ? decryptSession(token) : Promise.resolve(null);
    }),
  );
  if (web && tg) return (tg.signedInAt ?? 0) >= (web.signedInAt ?? 0) ? tg : web;
  return tg ?? web;
}

export async function setSession(data: SessionData) {
  await writeSession(await cookies(), data);
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  return readSession((name) => cookieStore.get(name)?.value);
}

export async function clearSession() {
  clearSessionCookies(await cookies());
}
