import { ApiError } from "./api";

export function extractErrorMessage(err: unknown, fallback = "Xatolik yuz berdi") {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string | string[] } | null;
    if (Array.isArray(body?.message)) return body.message[0] ?? fallback;
    if (typeof body?.message === "string") return body.message;
  }
  return fallback;
}
