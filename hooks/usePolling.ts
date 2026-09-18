"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `fn` every `intervalMs` — but only while the tab is visible, the
 * browser is online, and `enabled` is true. Pauses otherwise and fires
 * immediately when the page becomes visible/online again so the view
 * catches up without waiting a full interval.
 */
export default function usePolling(fn: () => void | Promise<void>, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const active = () =>
      document.visibilityState === "visible" && navigator.onLine;

    const start = () => {
      if (timer || !active()) return;
      timer = setInterval(() => {
        if (active()) fnRef.current();
      }, intervalMs);
    };

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onChange = () => {
      if (active()) {
        fnRef.current();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
    };
  }, [intervalMs, enabled]);
}
