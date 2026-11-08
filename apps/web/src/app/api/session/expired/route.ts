import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Where a page lands when its session turned out to be dead mid-render: a
 * Server Component can't drop the cookie itself, so it sends the browser here.
 */
export function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", req.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
