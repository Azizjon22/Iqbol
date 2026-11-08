"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface BackButton {
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

function webApp() {
  return (window as { Telegram?: { WebApp?: { ready: () => void; expand: () => void; BackButton?: BackButton } } }).Telegram?.WebApp;
}

const HOMES = ["/dashboard", "/worker"];

/**
 * Inside the Telegram mini app: keeps Telegram's script loaded on every page
 * (so the app knows it runs there) and drives Telegram's own back button,
 * since the mini app has no browser bar to go back with.
 */
export function TelegramBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const back = webApp()?.BackButton;
    if (!back) return;
    if (HOMES.includes(pathname)) {
      back.hide();
      return;
    }
    const home = pathname.startsWith("/worker") ? "/worker" : "/dashboard";
    const goBack = () => (window.history.length > 1 ? router.back() : router.push(home));
    back.show();
    back.onClick(goBack);
    return () => back.offClick(goBack);
  }, [ready, pathname, router]);

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
      onReady={() => {
        const app = webApp();
        app?.ready();
        app?.expand();
        setReady(true);
      }}
    />
  );
}
