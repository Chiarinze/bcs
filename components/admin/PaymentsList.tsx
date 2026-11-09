"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";

interface Payment {
  reference: string;
  kind: string;
  status: string;
  review_reason: string | null;
  amount_kobo: number;
  paid_kobo: number | null;
  email: string;
  name: string | null;
  gateway_status: string | null;
  created_at: string;
  events?: { title: string } | null;
}

const TABS = [
  { value: "needs_review", label: "Needs review" },
  { value: "pending", label: "In progress" },
  { value: "fulfilled", label: "Completed" },
  { value: "failed", label: "Not paid" },
  { value: "refunded", label: "Refunded" },
  { value: "dismissed", label: "Dismissed" },
];

const KINDS: Record<string, string> = {
  ticket: "Ticket",
  internal: "Member registration",
  donation: "Donation",
  unknown: "Unmatched",
};

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

export default function PaymentsList() {
  const [status, setStatus] = useState("needs_review");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payments?status=${status}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayments(data.payments);
    } catch {
      setError("Could not load payments.");
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(reference: string, action: "recheck" | "complete" | "dismiss") {
    if (action === "complete" && !confirm("Create the ticket or registration for this payment? Paystack must show it as paid.")) return;
    if (action === "dismiss" && !confirm("Close this item without completing it?")) return;

    setWorking(reference);
    setError("");
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(reference)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (action === "complete" && data.status !== "fulfilled") {
        setError(
          data.gateway === "success"
            ? "This payment still can't be completed. See the reason shown."
            : "Paystack doesn't show this payment as paid, so it wasn't completed."
        );
      }
      await load();
    } catch (err) {
      setError((err as Error).message || "That didn't work. Please try again.");
    }
    setWorking(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-bcs-green">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every Paystack payment. Anything that couldn&apos;t complete by itself appears under Needs review.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              status === tab.value
                ? "bg-bcs-green text-white border-bcs-green"
                : "bg-white text-gray-700 border-gray-200 hover:border-bcs-green"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : payments.length === 0 ? (
        <p className="text-gray-500 text-sm">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.reference} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {naira(p.paid_kobo ?? p.amount_kobo)} · {KINDS[p.kind] ?? p.kind}
                    {p.events?.title ? ` · ${p.events.title}` : ""}
                  </p>
                  <p className="text-sm text-gray-600 break-all">
                    {p.name ? `${p.name} · ` : ""}
                    {p.email}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()}</p>
              </div>

              {p.review_reason && (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">{p.review_reason}</p>
              )}

              <p className="text-xs text-gray-400 font-mono break-all">
                {p.reference}
                {p.gateway_status ? ` · Paystack: ${p.gateway_status}` : ""}
              </p>

              {(p.status === "needs_review" || p.status === "pending" || p.status === "failed") && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" loading={working === p.reference} onClick={() => act(p.reference, "recheck")} className="text-sm">
                    Check Paystack
                  </Button>
                  {p.status === "needs_review" && p.kind !== "unknown" && (
                    <Button loading={working === p.reference} onClick={() => act(p.reference, "complete")} className="text-sm bg-bcs-green hover:bg-bcs-accent">
                      Complete registration
                    </Button>
                  )}
                  {p.status === "needs_review" && (
                    <Button variant="outline" loading={working === p.reference} onClick={() => act(p.reference, "dismiss")} className="text-sm">
                      Dismiss
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
