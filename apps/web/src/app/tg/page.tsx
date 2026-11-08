import type { Metadata } from "next";
import { TelegramEntry } from "@/components/telegram/telegram-entry";

export const metadata: Metadata = { title: "Iqbol" };

/** Where the Telegram mini app opens: signs the linked account in, then moves on. */
export default async function TelegramPage({ searchParams }: PageProps<"/tg">) {
  const { next } = await searchParams;
  return <TelegramEntry next={typeof next === "string" ? next : undefined} />;
}
