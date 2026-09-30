import { NextRequest, NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import { getLocale } from "@/i18n/locale";
import { trText } from "@/i18n/tr";

function localizeBody(body: unknown, locale: Awaited<ReturnType<typeof getLocale>>) {
  if (!body || typeof body !== "object") return body;
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string") return { ...(body as object), message: trText(locale, message) };
  if (Array.isArray(message)) {
    return {
      ...(body as object),
      message: message.map((item) => (typeof item === "string" ? trText(locale, item) : item)),
    };
  }
  return body;
}

async function handle(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search;
  const targetPath = `/${path.join("/")}${search}`;

  const method = req.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.text() : undefined;

  const locale = await getLocale();
  try {
    const data = await apiFetch(targetPath, {
      method,
      body: body && body.length > 0 ? body : undefined,
    });
    return NextResponse.json(data ?? {});
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(localizeBody(error.body ?? { message: error.message }, locale), { status: error.status });
    }
    return NextResponse.json({ message: trText(locale, "Kutilmagan xatolik yuz berdi") }, { status: 500 });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
