/** Client-side call to the menus API through the authenticated proxy. */
export async function menuApi<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`/api/proxy/menus${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? "Xatolik yuz berdi");
  }
  return data as T;
}

export function errorText(err: unknown) {
  return err instanceof Error ? err.message : "Xatolik yuz berdi";
}
