import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3101/api";

/**
 * Public worker sign-up, forwarded server-side so the browser never talks to
 * the NestJS API directly — in production the API is not exposed at all.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/workers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Server bilan bog'lanib bo'lmadi" }, { status: 502 });
  }
  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}
