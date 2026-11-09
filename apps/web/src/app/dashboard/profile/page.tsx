import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBrand } from "@/lib/brand";
import { ProfilePage } from "@/components/profile/profile-page";
import { apiFetch } from "@/lib/api";
import type { TelegramStatus } from "@/lib/actions/telegram.actions";

export default async function ProfileRoute({ searchParams }: PageProps<"/dashboard/profile">) {
  const [session, brand, query] = await Promise.all([getSession(), getBrand(), searchParams]);
  if (!session || session.user.kind !== "STAFF") redirect("/login");
  const telegram = await apiFetch<TelegramStatus>("/telegram/status").catch(() => null);

  return (
    <ProfilePage
      user={{ fullName: session.user.fullName, phone: session.user.phone, role: session.user.role }}
      brand={brand}
      canEditBrand={session.user.role === "SUPER_ADMIN"}
      passwordChanged={query.password === "ok"}
      telegram={telegram}
    />
  );
}
