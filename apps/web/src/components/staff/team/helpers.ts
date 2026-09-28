import type { StaffRole } from "@iqbol/shared";

export const ROLE_META: Record<StaffRole, { label: string; tone: string; ring: string; can: string[] }> = {
  SUPER_ADMIN: {
    label: "Super admin",
    tone: "bg-primary/15 text-primary",
    ring: "ring-primary/50",
    can: ["Hamma bo'limlar va moliya", "Xodimlar va brend", "Bozorlikni tasdiqlash"],
  },
  ADMIN: {
    label: "Admin",
    tone: "bg-accent/15 text-accent",
    ring: "ring-accent/50",
    can: ["To'ylar va ishchilar", "Ombor va bozorlik xaridi", "Pul ma'lumotlarisiz"],
  },
  ZAVZAL: {
    label: "Zavzal",
    tone: "bg-success/15 text-success",
    ring: "ring-success/50",
    can: ["To'ylar kalendari", "Ishchilarni biriktirish", "Faqat ko'rish va tayyorgarlik"],
  },
};

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** "hozirgina", "5 daqiqa oldin", "3 soat oldin", "2 kun oldin". */
export function ago(date: string | null | undefined) {
  if (!date) return "hali faoliyat yo'q";
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "hozirgina";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  return `${Math.floor(days / 30)} oy oldin`;
}

/** Readable temporary password: no look-alike characters (0/O, 1/l). */
export function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function staffApi(path: string, method: string, body?: unknown) {
  const res = await fetch(`/api/proxy${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((Array.isArray(data?.message) ? data.message[0] : data?.message) ?? "Xatolik yuz berdi");
  }
  return res.json().catch(() => null);
}
