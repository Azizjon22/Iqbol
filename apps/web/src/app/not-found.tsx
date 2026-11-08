import Link from "next/link";
import { getTr } from "@/i18n/server-tr";

export default async function NotFound() {
  const tr = await getTr();
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="font-display text-gilded-adaptive text-6xl font-semibold lining-nums">404</p>
        <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">{tr("Sahifa topilmadi")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{tr("Bu manzilda sahifa yo'q yoki u ko'chirilgan.")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {tr("Bosh sahifaga")}
        </Link>
      </div>
    </div>
  );
}
