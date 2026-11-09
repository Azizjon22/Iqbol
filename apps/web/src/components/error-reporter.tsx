"use client";

import { useEffect } from "react";

/** Sends uncaught browser errors to the error-alert bot (through /api/client-errors). */
export function ErrorReporter() {
  useEffect(() => {
    function send(message: string, stack?: string) {
      // Noise from extensions and aborted loads, not from the app.
      if (!message || /ResizeObserver loop|Script error\.?$|chrome-extension:/.test(message)) return;
      void fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, stack, url: window.location.pathname }),
        keepalive: true,
      }).catch(() => undefined);
    }
    const onError = (e: ErrorEvent) => send(e.message, (e.error as Error | undefined)?.stack);
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as Error | string | undefined;
      send(typeof reason === "string" ? reason : (reason?.message ?? "Unhandled rejection"), typeof reason === "string" ? undefined : reason?.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
