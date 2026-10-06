import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3011/api";

/**
 * Public worker sign-up, forwarded server-side so the browser never talks to
 * the NestJS API directly — in production the API is not exposed at all.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers = new Headers({ "Content-Type": "application/json" });
  // The API rate-limits sign-ups; pass the visitor's address along.
  const ip = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  if (ip) headers.set("X-Forwarded-For", ip);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/workers/register`, { method: "POST", headers, body, cache: "no-store" });
  } catch {
    return NextResponse.json({ message: "Server bilan bog'lanib bo'lmadi" }, { status: 502 });
  }
  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}
