"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { forgetPayment, recallPayment } from "@/hooks/useCheckout";

const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Shown on payment forms when this browser has a payment we never saw finish,
 * so someone whose connection dropped checks on it instead of paying twice.
 */
export default function PendingPaymentNotice() {
  const [notice, setNotice] = useState<{ href: string; text: string } | null>(null);

  useEffect(() => {
    const saved = recallPayment();
    if (!saved) return;
    if (Date.now() - saved.at > MAX_AGE_MS) {
      forgetPayment();
      return;
    }

    const href = `/payment/status?reference=${encodeURIComponent(saved.reference)}`;

    fetch(`/api/payments/status?reference=${encodeURIComponent(saved.reference)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (data.status === "fulfilled") {
          forgetPayment();
          setNotice({ href: data.success_url || href, text: "Your last payment went through. View your confirmation." });
        } else if (data.status === "needs_review") {
          setNotice({ href, text: "We received your last payment and are confirming it. Please don't pay again." });
        } else if (data.status === "pending" && data.gateway && data.gateway !== "abandoned" && data.gateway !== "not_found") {
          setNotice({ href, text: "Your last payment is still being processed. Please don't pay again yet." });
        } else if (data.status !== "pending") {
          forgetPayment();
        }
      })
      .catch((status) => {
        if (status === 404) forgetPayment();
      });
  }, []);

  if (!notice) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-4">
      {notice.text}{" "}
      <Link href={notice.href} className="font-medium underline">
        Check status
      </Link>
    </div>
  );
}
