"use client";

import { useEffect, useRef } from "react";

type HCaptchaGlobal = {
  render: (
    container: HTMLElement,
    opts: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark";
      size?: "normal" | "compact" | "invisible";
    }
  ) => number;
  reset: (id?: number) => void;
  remove: (id: number) => void;
};

declare global {
  interface Window {
    hcaptcha?: HCaptchaGlobal;
    __hcaptchaOnload?: () => void;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadHCaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.hcaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve) => {
    window.__hcaptchaOnload = () => resolve();
    const s = document.createElement("script");
    s.src =
      "https://js.hcaptcha.com/1/api.js?render=explicit&onload=__hcaptchaOnload";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });

  return scriptPromise;
}

interface Props {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  /** Change this to force the widget to re-render (e.g., after submit). */
  resetKey?: string | number;
}

export default function HCaptchaWidget({
  siteKey,
  onVerify,
  onExpire,
  resetKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadHCaptchaScript().then(() => {
      if (cancelled || !containerRef.current || !window.hcaptcha) return;

      // Remove any prior instance before re-rendering
      if (widgetIdRef.current !== null) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        "expired-callback": onExpire,
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, resetKey]);

  return <div ref={containerRef} />;
}
