"use client";

import { useEffect, useRef } from "react";

/**
 * A silent looping preview that only plays while it is on screen.
 *
 * A gallery of clips all playing at once makes every one of them stutter:
 * each fights the others for bandwidth and for the video decoder. Off-screen
 * clips are paused, and nothing beyond the first frame is downloaded until a
 * clip scrolls into view.
 */
export function InViewVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Autoplay can be refused (battery saver, data saver): the first frame stays up.
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return <video ref={ref} src={src} muted loop playsInline preload="metadata" className={className} />;
}
