/**
 * PDFs on the site: downloaded in a browser, but sent to the user's own
 * Telegram chat inside the mini app — a file opened there fills the whole
 * mini app with no way back.
 */

export function inTelegramMiniApp() {
  if (typeof window === "undefined") return false;
  const app = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
  return Boolean(app?.initData);
}

async function errorMessage(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
  return typeof message === "string" ? message : fallback;
}

/** POSTs to a "send to my Telegram" route. */
export async function sendPdfToTelegram(url: string) {
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(await errorMessage(res, "Yuborib bo'lmadi"));
}

/** Fetches a PDF and saves it as a file. */
export async function downloadPdf(url: string, fallbackName = "hisobot.pdf") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await errorMessage(res, "Hisobotni tayyorlab bo'lmadi"));
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Download in a browser, Telegram chat in the mini app. Returns where it went. */
export async function deliverPdf(downloadUrl: string, telegramUrl: string): Promise<"telegram" | "download"> {
  if (inTelegramMiniApp()) {
    await sendPdfToTelegram(telegramUrl);
    return "telegram";
  }
  await downloadPdf(downloadUrl);
  return "download";
}
