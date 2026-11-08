import { NextRequest, NextResponse } from "next/server";
import { getSession, refreshSession, setSession } from "@/lib/session-refresh";

const API_URL = process.env.API_URL ?? "http://localhost:3011/api";

/** Streams a report PDF from the API with the signed-in super admin's token. */
export async function GET(req: NextRequest) {
  let session = await getSession();
  if (!session) return NextResponse.json({ message: "Avval tizimga kiring" }, { status: 401 });

  const query = req.nextUrl.searchParams.toString();
  const load = (token: string) =>
    fetch(`${API_URL}/reports/pdf?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });

  let res = await load(session.accessToken);
  if (res.status === 401) {
    const refreshed = await refreshSession(session);
    if (!refreshed) return NextResponse.json({ message: "Sessiya tugadi — qayta kiring" }, { status: 401 });
    await setSession(refreshed);
    session = refreshed;
    res = await load(session.accessToken);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json({ message: body?.message ?? "Hisobotni tayyorlab bo'lmadi" }, { status: res.status });
  }
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("content-disposition") ?? 'attachment; filename="hisobot.pdf"',
    },
  });
}
