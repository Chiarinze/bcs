// components/admin/NewCouponForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCouponForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      code: String(form.get("code") || "").trim().toUpperCase(),
      discount_percent: Number(form.get("discount_percent")),
      usage_limit: form.get("usage_limit")
        ? Number(form.get("usage_limit"))
        : null,
      is_active: form.get("is_active") === "on",
    };

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create coupon");
      }

      router.push("/admin/coupons");
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="code"
        placeholder="Coupon code (e.g. EVENT50)"
        required
        className="input"
      />
      <input
        name="discount_percent"
        type="number"
        min={1}
        max={100}
        placeholder="Discount %"
        required
        className="input"
      />
      <input
        name="usage_limit"
        type="number"
        min={1}
        placeholder="Usage limit (leave blank for unlimited)"
        className="input"
      />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="is_active" defaultChecked /> Active
      </label>
      <button
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        {loading ? "Creating..." : "Create Coupon"}
      </button>
    </form>
  );
}

