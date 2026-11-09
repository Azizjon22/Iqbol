import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3011/api";

/** Browser errors, passed on to the API's error-alert bot. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.message !== "string") return new NextResponse(null, { status: 400 });
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
  await fetch(`${API_URL}/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: body.message.slice(0, 1000),
      stack: str(body.stack, 8000),
      url: str(body.url, 1000),
      userAgent: str(req.headers.get("user-agent"), 500),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
