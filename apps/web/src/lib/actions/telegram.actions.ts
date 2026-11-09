"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/errors";

export type TelegramStatus = {
  enabled: boolean;
  botUsername: string | null;
  linked: boolean;
  linkedAt: string | null;
};

/** A fresh one-time bot link (15 minutes) for the signed-in account. */
export async function telegramLinkAction(): Promise<{ url?: string; error?: string }> {
  try {
    const { url } = await apiFetch<{ url: string }>("/telegram/link", { method: "POST" });
    return { url };
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}

export async function telegramUnlinkAction(): Promise<{ error?: string }> {
  try {
    await apiFetch("/telegram/link", { method: "DELETE" });
    revalidatePath("/dashboard/profile");
    revalidatePath("/worker");
    return {};
  } catch (err) {
    return { error: extractErrorMessage(err) };
  }
}
