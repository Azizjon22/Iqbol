import { NextRequest, NextResponse } from "next/server";
import { writeSession, type SessionData } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://localhost:3011/api";

/** Only a path on this site — never another host. */
function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/**
 * The mini app posts Telegram's signed launch data here; the API checks the
 * signature and the linked account, and the session cookie is set for the
 * Telegram webview (see writeSession).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { initData?: string; next?: string } | null;
  if (!body?.initData) {
    return NextResponse.json({ message: "Ilovani Telegram ichidan oching" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: body.initData }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Server bilan aloqa yo'q — birozdan keyin qayta urinib ko'ring" }, { status: 502 });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ message: data?.message ?? "Kirib bo'lmadi" }, { status: res.status });
  }

  const session: SessionData = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
    telegram: true,
  };
  const home = session.user.kind === "STAFF" ? "/dashboard" : "/worker";
  const response = NextResponse.json({ redirect: safeNext(body.next) ?? home });
  // A fresh sign-in: whatever session this browser held before is replaced.
  await writeSession(response.cookies, session);
  return response;
}
