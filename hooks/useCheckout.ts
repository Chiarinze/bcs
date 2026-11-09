"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "bcs:pending-payment";

export function rememberPayment(reference: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ reference, at: Date.now() }));
  } catch {
    // Only a convenience: the webhook completes the payment regardless.
  }
}

export function recallPayment(): { reference: string; at: number } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return typeof saved?.reference === "string" ? saved : null;
  } catch {
    return null;
  }
}

export function forgetPayment() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up.
  }
}

export type CheckoutResult = { free: true } | { error: string; amount?: number } | { leaving: true };

/**
 * Starts a payment: the server saves the order and prices it, then the
 * customer goes to Paystack's hosted checkout. Nothing about the payment lives
 * in this page, so it survives the tab being closed or the network dropping.
 */
export function useCheckout() {
  const [starting, setStarting] = useState(false);
  const busy = useRef(false);

  // Pressing Back from Paystack can restore this page exactly as it was left.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) {
        busy.current = false;
        setStarting(false);
      }
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const startCheckout = useCallback(async (order: Record<string, unknown>): Promise<CheckoutResult> => {
    if (busy.current) return { leaving: true };
    busy.current = true;
    setStarting(true);

    const stop = (result: CheckoutResult) => {
      busy.current = false;
      setStarting(false);
      return result;
    };

    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) return stop({ error: data.error || "Payment could not be started. Please try again.", amount: data.amount });
      if (data.free) return stop({ free: true });

      if (data.reference) rememberPayment(data.reference);
      const next = data.authorization_url || data.status_url;
      if (!next) return stop({ error: "Payment could not be started. Please try again." });

      window.location.assign(next);
      return { leaving: true }; // stay "busy" until the browser navigates away
    } catch {
      return stop({ error: "We could not reach the server. You have not been charged. Please check your connection and try again." });
    }
  }, []);

  return { startCheckout, starting };
}
