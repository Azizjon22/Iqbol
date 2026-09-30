"use server";
import { getTr } from "@/i18n/server-tr";


import { redirect } from "next/navigation";
import { staffLoginSchema, workerLoginSchema } from "@iqbol/shared";
import { clearSession, getSession, setSession, type SessionUser } from "@/lib/session";
import { apiFetch, publicApiUrl } from "@/lib/api";
import { extractErrorMessage } from "@/lib/errors";

type AuthTokenResponse = { accessToken: string; refreshToken: string; user: SessionUser };

export type AuthActionState = { error?: string } | undefined;

export async function loginStaffAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const tr = await getTr();

  const parsed = staffLoginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: tr(parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri") };
  }

  const res = await fetch(publicApiUrl("/auth/staff/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: tr(body?.message ?? "Login yoki parol noto'g'ri") };
  }

  const data = await res.json();
  await setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
  redirect(data.user.mustChangePassword ? "/change-password" : "/dashboard");
}

export async function loginWorkerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const tr = await getTr();

  const parsed = workerLoginSchema.safeParse({
    phone: formData.get("phone"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) {
    return { error: tr(parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri") };
  }

  const res = await fetch(publicApiUrl("/auth/worker/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: tr(body?.message ?? "Login yoki PIN noto'g'ri") };
  }

  const data = await res.json();
  await setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
  redirect(data.user.mustChangePin ? "/change-pin" : "/worker");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function changeStaffPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const tr = await getTr();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 6) {
    return { error: tr("Yangi parol kamida 6 belgidan iborat bo'lishi kerak") };
  }
  if (newPassword !== confirmPassword) {
    return { error: tr("Yangi parol va tasdiqlash mos kelmadi") };
  }
  if (newPassword === currentPassword) {
    return { error: tr("Yangi parol avvalgisidan farq qilishi kerak") };
  }

  const session = await getSession();
  if (!session || session.user.kind !== "STAFF") redirect("/login");

  let data: AuthTokenResponse;
  try {
    data = await apiFetch<AuthTokenResponse>("/auth/staff/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch (err) {
    return { error: tr(extractErrorMessage(err, "Parolni yangilab bo'lmadi")) };
  }

  await setSession(data);
  // The Profil page sends the user back to itself; only in-app dashboard paths are honoured.
  const redirectTo = String(formData.get("redirectTo") ?? "");
  redirect(redirectTo.startsWith("/dashboard") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard");
}

export async function changeWorkerPinAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const tr = await getTr();

  const currentPin = String(formData.get("currentPin") ?? "");
  const newPin = String(formData.get("newPin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");

  if (!/^[0-9]{4}$/.test(newPin)) {
    return { error: tr("Yangi PIN 4 ta raqamdan iborat bo'lishi kerak") };
  }
  if (newPin !== confirmPin) {
    return { error: tr("Yangi PIN va tasdiqlash mos kelmadi") };
  }
  if (newPin === currentPin) {
    return { error: tr("Yangi PIN avvalgisidan farq qilishi kerak") };
  }

  const session = await getSession();
  if (!session || session.user.kind !== "WORKER") redirect("/login");

  let data: AuthTokenResponse;
  try {
    data = await apiFetch<AuthTokenResponse>("/auth/worker/pin", {
      method: "PATCH",
      body: JSON.stringify({ currentPin, newPin }),
    });
  } catch (err) {
    return { error: tr(extractErrorMessage(err, "PIN kodni yangilab bo'lmadi")) };
  }

  await setSession(data);
  redirect("/worker");
}
