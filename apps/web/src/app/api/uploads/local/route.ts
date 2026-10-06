import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3011/api";

/** Forwards the raw file bytes. The JSON API proxy would decode them as text. */
export async function PUT(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ message: "Yuklash havolasi eskirgan" }, { status: 401 });
  }

  const body = await req.arrayBuffer();
  const contentType = req.headers.get("content-type") ?? "application/octet-stream";
  let res: Response;
  try {
    res = await fetch(`${API_URL}/uploads/local?token=${encodeURIComponent(token)}`, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
  } catch {
    return NextResponse.json({ message: "Faylni saqlab bo'lmadi — qayta urinib ko'ring" }, { status: 502 });
  }

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
