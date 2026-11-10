"use server";
import { getTr } from "@/i18n/server-tr";
import { cookies } from "next/headers";
import { getLocale } from "@/i18n/locale";
import { LOCALE_COOKIE } from "@/i18n/types";


import { redirect } from "next/navigation";
import { staffLoginSchema, workerLoginSchema } from "@iqbol/shared";
import { clearSession, getSession, setSession, type SessionUser } from "@/lib/session";
import { apiFetch, publicApiUrl } from "@/lib/api";
import { extractErrorMessage } from "@/lib/errors";

type AuthTokenResponse = { accessToken: string; refreshToken: string; user: SessionUser };

export type AuthActionState = { error?: string; kind?: "credentials" | "connection" } | undefined;

/**
 * A sign-in made inside the Telegram mini app links that Telegram account, so
 * the next launch signs in by itself; the session then gets the mini app's
 * cookie. Linking is best-effort: the sign-in itself already succeeded.
 */
async function linkTelegram(formData: FormData, accessToken: string): Promise<boolean> {
  const initData = formData.get("tgInitData");
  if (typeof initData !== "string" || !initData) return false;
  try {
    await fetch(publicApiUrl("/telegram/webapp-link"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ initData }),
      cache: "no-store",
    });
  } catch {
    // Still signed in; only the automatic next sign-in is lost.
  }
  return true;
}

/**
 * The bot writes in the language the site is used in — when this browser
 * has picked one (no cookie: leave what was chosen elsewhere). Best-effort.
 */
async function syncBotLanguage(accessToken: string) {
  if (!(await cookies()).get(LOCALE_COOKIE)) return;
  try {
    await fetch(publicApiUrl("/telegram/language"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ language: await getLocale() }),
      cache: "no-store",
    });
  } catch {
    // Signed in all the same.
  }
}

const CONNECTION_ERROR = "Server bilan bog'lanib bo'lmadi. Ulanishni tekshirib, qayta urinib ko'ring.";

async function postLogin(url: string, body: unknown): Promise<Response | "connection"> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return "connection";
  }
}

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
    return { error: tr(parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri"), kind: "credentials" };
  }

  const res = await postLogin(publicApiUrl("/auth/staff/login"), parsed.data);
  if (res === "connection") return { error: tr(CONNECTION_ERROR), kind: "connection" };
  if (!res.ok) {
    if (res.status >= 500) return { error: tr(CONNECTION_ERROR), kind: "connection" };
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    return { error: tr(message ?? "Login yoki parol noto'g'ri"), kind: "credentials" };
  }

  const data = await res.json();
  await syncBotLanguage(data.accessToken);
  const telegram = await linkTelegram(formData, data.accessToken);
  await setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user, ...(telegram && { telegram }) });
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
    return { error: tr(parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri"), kind: "credentials" };
  }

  const res = await postLogin(publicApiUrl("/auth/worker/login"), parsed.data);
  if (res === "connection") return { error: tr(CONNECTION_ERROR), kind: "connection" };
  if (!res.ok) {
    if (res.status >= 500) return { error: tr(CONNECTION_ERROR), kind: "connection" };
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    return { error: tr(message ?? "Login yoki PIN noto'g'ri"), kind: "credentials" };
  }

  const data = await res.json();
  await syncBotLanguage(data.accessToken);
  const telegram = await linkTelegram(formData, data.accessToken);
  await setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user, ...(telegram && { telegram }) });
  redirect(data.user.mustChangePin ? "/change-pin" : "/worker");
}

export async function logoutAction() {
  await clearSession();
  // ?out: the login page must not sign the linked Telegram account straight back in.
  redirect("/login?out=1");
}

export async function changeStaffPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const tr = await getTr();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: tr("Yangi parol kamida 8 belgidan iborat bo'lishi kerak") };
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

  // Same place as before (mini app or browser), new tokens.
  await setSession({ ...data, telegram: session.telegram });
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

  await setSession({ ...data, telegram: session.telegram });
  redirect("/worker");
}
