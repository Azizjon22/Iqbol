import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FORWARDED = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "cross-origin-resource-policy",
];

/**
 * Serves `/uploads/...` from the API at request time and forwards Range, so a
 * video can start. The rewrite in next.config is fixed when the image is built
 * and on a server often points at a host that does not exist.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const api = process.env.API_URL ?? "http://localhost:3011/api";
  const origin = api.replace(/\/api\/?$/, "");
  const headers = new Headers();
  const range = req.headers.get("range");
  if (range) headers.set("range", range);

  let upstream: Response;
  try {
    upstream = await fetch(
      `${origin}/api/uploads/files/${path.map(encodeURIComponent).join("/")}`,
      { headers, cache: "no-store" },
    );
  } catch {
    return NextResponse.json({ message: "Fayl topilmadi" }, { status: 502 });
  }

  const out = new Headers();
  for (const name of FORWARDED) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers: out });
}
