"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useTr } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

/** Shown instead of a bare crash page when a route throws while rendering. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const tr = useTr();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70svh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{tr("Nimadir xato ketdi")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {tr("Sahifani ochib bo'lmadi. Qayta urinib ko'ring — muammo takrorlansa, administratorga xabar bering.")}
        </p>
        {error.digest && <p className="mt-3 text-xs tabular-nums text-muted-foreground/70">#{error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> {tr("Qayta urinish")}
          </Button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium transition hover:bg-muted"
          >
            {tr("Bosh sahifaga")}
          </Link>
        </div>
      </div>
    </div>
  );
}
