"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { CouponStatus, CouponUsage } from "@/components/admin/CouponUsage";

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  usage_count: number;
  usage_limit?: number | null;
}

interface Event {
  id: string;
  is_paid: boolean;
  title: string;
}

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green";

export default function CouponsSection({
  codes,
  event,
  held = {},
}: {
  codes: Coupon[];
  event: Event;
  /** Uses currently held by unpaid checkouts, keyed by coupon code. */
  held?: Record<string, number>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [limit, setLimit] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          code,
          discount_percent: Number(discount),
          usage_limit: limit.trim() ? Number(limit) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create coupon");

      setCode("");
      setDiscount("");
      setLimit("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setFormError((err as Error).message);
    }
    setCreating(false);
  }

  async function toggleCoupon(id: string, is_active: boolean) {
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update coupon");
      router.refresh();
    } catch (err) {
      alert((err as Error).message || "Failed to update coupon");
    }
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Permanently delete this coupon?")) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete coupon");
      router.refresh();
    } catch (err) {
      alert((err as Error).message || "Failed to delete coupon");
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-serif text-bcs-green">Coupon Codes</h2>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-bcs-green hover:bg-bcs-accent">
            + New Coupon
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createCoupon} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. EARLYBIRD10"
                required
                maxLength={40}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Discount %</span>
              <input
                type="number"
                min={1}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="e.g. 10"
                required
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">
                Max uses <span className="font-normal text-gray-500">(optional)</span>
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="Unlimited"
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Leave Max uses blank for unlimited. You can change it at any time below.
          </p>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={creating} className="bg-bcs-green hover:bg-bcs-accent">
              Create coupon
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setFormError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {codes.length === 0 ? (
        <p className="text-gray-500">No coupons yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-t">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Uses (max)</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="p-3 font-medium">{c.code}</td>
                  <td className="p-3">{c.discount_percent}%</td>
                  <td className="p-3">
                    <CouponStatus coupon={c} />
                  </td>
                  <td className="p-3">
                    <CouponUsage
                      key={`${c.id}-${c.usage_limit ?? ""}`}
                      coupon={c}
                      held={held[c.code] ?? 0}
                      onSaved={() => router.refresh()}
                    />
                  </td>
                  <td className="p-3 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => toggleCoupon(c.id, c.is_active)}
                      className="text-sm border border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white"
                    >
                      {c.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deleteCoupon(c.id)}
                      className="text-red-600 border-red-500 hover:bg-red-600 hover:text-white text-sm"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
