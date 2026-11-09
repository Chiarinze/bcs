"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { forgetPayment } from "@/hooks/useCheckout";

type View = "checking" | "slow" | "offline" | "review" | "not_completed" | "refunded" | "unknown" | "done";

const FAST_POLLS = 15; // every 3s for the first 45s
const POLL_LIMIT = 45; // then every 10s for 5 more minutes

export default function PaymentStatusClient() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? params.get("trxref") ?? "";
  const cancelled = params.get("cancelled") === "1";

  const [view, setView] = useState<View>(reference ? "checking" : "unknown");
  const [retryUrl, setRetryUrl] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const polls = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(async () => {
    polls.current += 1;
    const again = () => {
      if (polls.current < POLL_LIMIT) {
        timer.current = setTimeout(check, polls.current < FAST_POLLS ? 3000 : 10000);
      }
    };

    try {
      const res = await fetch(`/api/payments/status?reference=${encodeURIComponent(reference)}`, { cache: "no-store" });

      if (res.status === 404 || res.status === 400) {
        forgetPayment();
        setView("unknown");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));

      const data = await res.json();
      setRetryUrl(data.retry_url ?? null);

      if (data.status === "fulfilled") {
        forgetPayment();
        setSuccessUrl(data.success_url ?? null);
        setView("done");
        if (data.success_url) window.location.replace(data.success_url);
      } else if (data.status === "needs_review") {
        setView("review");
      } else if (data.status === "refunded") {
        forgetPayment();
        setView("refunded");
      } else if (data.status === "failed" || (cancelled && data.gateway !== "ongoing")) {
        forgetPayment();
        setView("not_completed");
      } else {
        setView(polls.current >= FAST_POLLS ? "slow" : "checking");
        again();
      }
    } catch {
      // Our server or the network, not the payment. Keep trying quietly.
      setView("offline");
      again();
    }
  }, [reference, cancelled]);

  useEffect(() => {
    if (!reference) return;
    check();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reference, check]);

  function checkNow() {
    if (timer.current) clearTimeout(timer.current);
    polls.current = Math.min(polls.current, FAST_POLLS);
    setView("checking");
    check();
  }

  const referenceLine = reference && (
    <p className="text-xs text-gray-400 mt-6 break-all">
      Reference: <span className="font-mono">{reference}</span>
    </p>
  );

  if (view === "checking") {
    return (
      <>
        <Loader2 className="w-12 h-12 text-bcs-green mx-auto mb-6 animate-spin" />
        <h1 className="text-2xl font-serif text-bcs-green mb-3">Confirming your payment</h1>
        <p className="text-gray-600">This usually takes a few seconds. Please keep this page open.</p>
        {referenceLine}
      </>
    );
  }

  if (view === "slow" || view === "offline") {
    return (
      <>
        <Clock className="w-12 h-12 text-bcs-green mx-auto mb-6" />
        <h1 className="text-2xl font-serif text-bcs-green mb-3">
          {view === "offline" ? "We can't reach the server right now" : "This is taking longer than usual"}
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment is not lost. If you were charged, it will be confirmed automatically and we will email you, even
          if you close this page. <strong>Please don&apos;t pay again.</strong>
        </p>
        <Button onClick={checkNow} className="bg-bcs-green hover:bg-bcs-accent">
          Check again
        </Button>
        {referenceLine}
      </>
    );
  }

  if (view === "review") {
    return (
      <>
        <Clock className="w-12 h-12 text-bcs-green mx-auto mb-6" />
        <h1 className="text-2xl font-serif text-bcs-green mb-3">We&apos;ve received your payment</h1>
        <p className="text-gray-600">
          Our team needs to confirm one detail and will be in touch by email. <strong>Please don&apos;t pay again.</strong>{" "}
          If you need help, contact us and quote the reference below.
        </p>
        {referenceLine}
      </>
    );
  }

  if (view === "done") {
    return (
      <>
        <CheckCircle className="w-12 h-12 text-bcs-green mx-auto mb-6" />
        <h1 className="text-2xl font-serif text-bcs-green mb-3">Payment confirmed</h1>
        <p className="text-gray-600 mb-6">Please check your email for your confirmation.</p>
        {successUrl && (
          <Link href={successUrl} className="text-bcs-green underline">
            Continue
          </Link>
        )}
        {referenceLine}
      </>
    );
  }

  const copy: Record<string, { title: string; text: string }> = {
    not_completed: { title: "Payment not completed", text: "You have not been charged. You can try again whenever you're ready." },
    refunded: { title: "Payment refunded", text: "This payment has been refunded." },
    unknown: { title: "Payment not found", text: "We couldn't find this payment. If you were charged, please contact us." },
  };

  return (
    <>
      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-6" />
      <h1 className="text-2xl font-serif text-bcs-green mb-3">{copy[view].title}</h1>
      <p className="text-gray-600 mb-6">{copy[view].text}</p>
      {view === "not_completed" && retryUrl && (
        <Link href={retryUrl}>
          <Button className="bg-bcs-green hover:bg-bcs-accent">Try again</Button>
        </Link>
      )}
      {referenceLine}
    </>
  );
}
