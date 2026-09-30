import type { WorkerSummary } from "@/lib/types";

export interface UpcomingAssignment {
  id: string;
  clientName: string;
  eventDate: string;
}

/** A worker plus the weddings they're already booked for (today onwards). */
export interface TeamWorker extends WorkerSummary {
  upcoming: UpcomingAssignment[];
}

export interface StaffingEvent {
  id: string;
  clientName: string;
  eventDate: string;
  guestCount: number;
  assignedWorkerIds: string[];
}

export function dayKey(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function workerApi(path: string, method: string, body?: unknown) {
  const res = await fetch(`/api/proxy/workers${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? "Xatolik yuz berdi");
  }
  return res.json().catch(() => null);
}
