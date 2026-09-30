import "server-only";
import { clearSession, getSession, setSession, SessionData } from "./session";

const API_URL = process.env.API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(typeof body === "string" ? body : JSON.stringify(body));
  }
}

async function rawFetch(path: string, init: RequestInit, accessToken?: string) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
}

export async function refreshSession(session: SessionData): Promise<SessionData | null> {
  const res = await rawFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!res.ok) return null;
  const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
  return { ...session, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

/**
 * Server-side API call carrying the current session's access token, with a
 * single transparent refresh-and-retry on 401. Used from Server Components,
 * Server Actions, and the authenticated API proxy route.
 */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await getSession();
  if (!session) throw new ApiError(401, { message: "No session" });

  let res = await rawFetch(path, init, session.accessToken);

  if (res.status === 401) {
    const refreshed = await refreshSession(session);
    if (!refreshed) {
      await clearSession().catch(() => undefined);
      throw new ApiError(401, { message: "Session expired" });
    }
    await setSession(refreshed).catch(() => undefined);
    res = await rawFetch(path, init, refreshed.accessToken);
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}

export function publicApiUrl(path: string) {
  return `${API_URL}${path}`;
}

/**
 * Server-side call to a @Public() NestJS endpoint — no session required.
 * Used for pages anyone can view, such as the public menu showcase.
 */
export async function publicApiFetch<T = unknown>(path: string): Promise<T> {
  const res = await rawFetch(path, { method: "GET" });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}
