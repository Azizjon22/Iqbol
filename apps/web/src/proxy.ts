import { NextRequest, NextResponse } from "next/server";
import { decryptSession, encryptSession, SESSION_COOKIE, type SessionData } from "@/lib/session";
import { isJwtExpiringSoon } from "@/lib/jwt-decode";

const ZAVZAL_EXACT_PATHS = ["/dashboard"];
const ZAVZAL_ALLOWED_PREFIXES = ["/dashboard/events", "/dashboard/workers", "/dashboard/profile"];

function isZavzalAllowed(pathname: string) {
  if (ZAVZAL_EXACT_PATHS.includes(pathname)) return true;
  return ZAVZAL_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(`${prefix}/`) || pathname === prefix);
}

async function refreshTokens(session: SessionData): Promise<SessionData | null> {
  const apiUrl = process.env.API_URL ?? "http://localhost:3001/api";
  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
    return { ...session, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  } catch {
    return null;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isWorkerArea = pathname.startsWith("/worker");
  // /showcase is the in-person presentation view staff show clients on a hall
  // tablet/computer — it is NOT public and must require a staff session.
  const isMenuShowcase = pathname.startsWith("/showcase") || pathname.startsWith("/menyular");

  // Keep old /menyular bookmarks working.
  if (pathname === "/menyular" || pathname.startsWith("/menyular/")) {
    const dest = pathname.replace(/^\/menyular/, "/showcase");
    return NextResponse.redirect(new URL(dest, req.url));
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  let session = cookie ? await decryptSession(cookie) : null;

  if (pathname === "/") {
    if (session?.user.kind === "STAFF") return NextResponse.redirect(new URL("/dashboard", req.url));
    if (session?.user.kind === "WORKER") return NextResponse.redirect(new URL("/worker", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!isDashboard && !isWorkerArea && !isMenuShowcase) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isDashboard && session.user.kind !== "STAFF") {
    return NextResponse.redirect(new URL("/worker", req.url));
  }
  if (isWorkerArea && session.user.kind !== "WORKER") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (isMenuShowcase && session.user.kind !== "STAFF") {
    return NextResponse.redirect(new URL("/worker", req.url));
  }

  if (session.user.kind === "STAFF" && session.user.role === "ZAVZAL" && !isZavzalAllowed(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  let response = NextResponse.next();

  if (isJwtExpiringSoon(session.accessToken)) {
    const refreshed = await refreshTokens(session);
    if (!refreshed) {
      response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    session = refreshed;
    const token = await encryptSession(refreshed);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
