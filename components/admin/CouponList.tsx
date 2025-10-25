// ./components/admin/CouponList.tsx
"use client";

import { useState } from "react";
import { Coupon } from "@/types";

export default function CouponList({ coupons }: { coupons: Coupon[] }) {
  const [items, setItems] = useState(coupons);

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/coupons/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !current }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      // simple local update
      setItems((s) => s.map((c) => (c.id === id ? { ...c, is_active: !current } : c)));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete coupon?")) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setItems((s) => s.filter((c) => c.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between p-3 border rounded">
          <div>
            <div className="font-medium">{c.code}</div>
            <div className="text-sm text-gray-600">Discount: {c.discount_percent}% · Used: {c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : " (unlimited)"}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleActive(c.id, c.is_active)} className={`px-3 py-1 rounded ${c.is_active ? "bg-yellow-500" : "bg-gray-300"}`}>
              {c.is_active ? "Deactivate" : "Activate"}
            </button>
            <button onClick={() => del(c.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
