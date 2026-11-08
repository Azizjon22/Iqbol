import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { StaffRole, WorkerPosition } from "@iqbol/shared";

export const SESSION_COOKIE = "iqbol_session";

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
  return new SignJWT({ ...data } as unknown as Record<string, unknown>)
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

/**
 * A mini app session must survive Telegram Web's iframe, where only a
 * SameSite=None, Secure, partitioned cookie is kept; everywhere else Lax.
 */
export function sessionCookieOptions(data: Pick<SessionData, "telegram">) {
  return data.telegram
    ? { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/", maxAge: MAX_AGE_SECONDS }
    : {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: MAX_AGE_SECONDS,
      };
}

export async function setSession(data: SessionData) {
  const token = await encryptSession(data);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(data));
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decryptSession(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  // The mini app's cookie lives in its own partition and needs its own delete.
  cookieStore.delete({ name: SESSION_COOKIE, path: "/", secure: true, sameSite: "none", partitioned: true });
}
