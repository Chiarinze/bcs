"use client";

import { useState } from "react";

export function isUsedUp(c: { usage_limit?: number | null; usage_count?: number | null }) {
  return typeof c.usage_limit === "number" && (c.usage_count ?? 0) >= c.usage_limit;
}

export function CouponStatus({ coupon }: { coupon: { is_active: boolean; usage_limit?: number | null; usage_count?: number | null } }) {
  if (!coupon.is_active) return <span className="text-gray-500 font-medium">Inactive</span>;
  if (isUsedUp(coupon)) return <span className="text-amber-700 font-medium">Used up</span>;
  return <span className="text-green-600 font-medium">Active</span>;
}

/**
 * Uses so far, and the max-uses limit, editable in place. Blank = unlimited.
 * `held` is how many of the uses belong to checkouts still being paid.
 */
export function CouponUsage({
  coupon,
  held = 0,
  onSaved,
}: {
  coupon: { id: string; usage_count?: number | null; usage_limit?: number | null };
  held?: number;
  onSaved: (limit: number | null) => void;
}) {
  const saved = coupon.usage_limit == null ? "" : String(coupon.usage_limit);
  const [value, setValue] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usage_limit: value.trim() === "" ? null : Number(value) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save");
      onSaved(data.coupon?.usage_limit ?? null);
    } catch (err) {
      setError((err as Error).message);
    }
    setSaving(false);
  }

  const used = coupon.usage_count ?? 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span>{used} of</span>
        <input
          type="number"
          min={1}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="∞"
          aria-label="Max uses (blank for unlimited)"
          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm"
        />
        {value !== saved && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-sm font-medium text-bcs-green underline disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
      {held > 0 && <p className="text-xs text-gray-500">{held} held by checkouts in progress</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
