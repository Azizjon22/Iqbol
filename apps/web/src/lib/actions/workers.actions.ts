"use server";
import { getTr } from "@/i18n/server-tr";


import { revalidatePath } from "next/cache";
import { workerRegisterSchema } from "@iqbol/shared";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/errors";

export type FormActionState = { error?: string; success?: boolean } | undefined;

export async function createWorkerByStaffAction(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tr = await getTr();

  const position = formData.get("position");
  const parsed = workerRegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    position,
    gender: formData.get("gender"),
    photoUrl: formData.get("photoUrl") || undefined,
    pin: position === "CHEF" ? formData.get("pin") || undefined : undefined,
  });
  if (!parsed.success) {
    return { error: tr(parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri") };
  }

  try {
    await apiFetch("/workers", { method: "POST", body: JSON.stringify(parsed.data) });
  } catch (err) {
    return { error: tr(extractErrorMessage(err, "Ishchini qo'shib bo'lmadi")) };
  }
  revalidatePath("/dashboard/workers");
  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function approveWorkerAction(workerId: string): Promise<{ error?: string }> {
  const tr = await getTr();

  try {
    await apiFetch(`/workers/${workerId}/approve`, { method: "PATCH" });
  } catch (err) {
    return { error: tr(extractErrorMessage(err, "Ishchini tasdiqlab bo'lmadi")) };
  }
  revalidatePath("/dashboard/workers");
  return {};
}

export async function rejectWorkerAction(workerId: string): Promise<{ error?: string }> {
  const tr = await getTr();

  try {
    await apiFetch(`/workers/${workerId}/reject`, { method: "PATCH" });
  } catch (err) {
    return { error: tr(extractErrorMessage(err, "Ishchini rad etib bo'lmadi")) };
  }
  revalidatePath("/dashboard/workers");
  return {};
}

export async function deleteWorkerAction(workerId: string): Promise<{ error?: string }> {
  const tr = await getTr();

  try {
    await apiFetch(`/workers/${workerId}`, { method: "DELETE" });
  } catch (err) {
    return { error: tr(extractErrorMessage(err, "Ishchini o'chirib bo'lmadi")) };
  }
  revalidatePath("/dashboard/workers");
  return {};
}

export async function resetWorkerPinAction(workerId: string, newPin: string): Promise<{ error?: string }> {
  const tr = await getTr();

  if (!/^[0-9]{4}$/.test(newPin)) {
    return { error: tr("PIN 4 ta raqamdan iborat bo'lishi kerak") };
  }
  try {
    await apiFetch(`/workers/${workerId}`, { method: "PATCH", body: JSON.stringify({ pin: newPin }) });
  } catch (err) {
    return { error: tr(extractErrorMessage(err, "PIN kodni tiklab bo'lmadi")) };
  }
  revalidatePath("/dashboard/workers");
  revalidatePath("/dashboard/staff");
  return {};
}
