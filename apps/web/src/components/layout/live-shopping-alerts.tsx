"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useTr } from "@/components/i18n/locale-provider";

const POLL_MS = 5000;
const TOAST_MS = 12000;

interface PendingLists {
  count: number;
  latest: { id: string; workerName: string; clientName: string | null; itemCount: number } | null;
}

/** A short two-note chime. Browsers mute it until the page has been clicked once. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* no audio — the toast is enough */
  }
}

/**
 * Keeps the bell in step with the chefs without a reload: asks the API every
 * few seconds while the tab is visible, and when a new list has arrived pops
 * a toast and refreshes the page underneath so the list itself shows up too.
 */
export function useLivePendingLists(initialCount: number, enabled: boolean) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [prevInitial, setPrevInitial] = useState(initialCount);
  const [alert, setAlert] = useState<PendingLists["latest"]>(null);
  const baseline = useRef(initialCount);
  const lastId = useRef<string | null | undefined>(undefined);

  // A server render (navigation, router.refresh) brings a fresher count.
  if (initialCount !== prevInitial) {
    setPrevInitial(initialCount);
    setCount(initialCount);
  }

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/shopping-lists/pending", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as PendingLists;
      const latestId = data.latest?.id ?? null;
      const isNew =
        data.latest !== null &&
        (lastId.current === undefined ? data.count > baseline.current : latestId !== lastId.current);
      lastId.current = latestId;
      baseline.current = data.count;
      setCount(data.count);
      if (isNew) {
        setAlert(data.latest);
        chime();
        router.refresh();
      }
    } catch {
      // Offline for a moment — the next tick tries again.
    }
  }, [router]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") void poll();
    };
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, poll]);

  useEffect(() => {
    if (!alert) return;
    const id = setTimeout(() => setAlert(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [alert]);

  return { count, alert, dismiss: () => setAlert(null) };
}

export function ShoppingListToast({ alert, onClose }: { alert: PendingLists["latest"]; onClose: () => void }) {
  const tr = useTr();
  if (!alert) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-sm animate-fade-up rounded-2xl border border-accent/60 bg-card/95 p-4 shadow-2xl shadow-black/30 ring-1 ring-accent/30 backdrop-blur md:inset-x-auto md:right-6 md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-foil text-ink">
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{tr("Yangi bozorlik ro'yxati")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {alert.workerName}
            {alert.clientName ? ` · ${alert.clientName}` : ""} · {alert.itemCount} {tr("ta mahsulot")}
          </p>
          <Link
            href="/dashboard/shopping-lists"
            onClick={onClose}
            className="mt-2 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            {tr("Ko'rish")}
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr("Yopish")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
