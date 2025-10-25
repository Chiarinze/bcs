"use client";

import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean; // ✅ match Supabase + API
  usage_count: number;
}

interface Event {
  id: string;
  is_paid: boolean;
  title: string;
}

export default function CouponsSection({
  codes,
  event,
}: {
  codes: Coupon[];
  event: Event;
}) {
  const router = useRouter();

  // ✅ Generate new coupon
  async function handleGenerateCode() {
    const code = prompt("Enter code name (e.g. EARLYBIRD10):");
    const discount = prompt("Enter discount percent (e.g. 10):");
    if (!code || !discount) return;

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          code,
          discount_percent: Number(discount),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Coupon created successfully!");
        router.refresh();
      } else {
        alert(data.error || "Failed to create coupon");
      }
    } catch (err) {
      alert("Failed to create coupon.");
      console.error(err);
    }
  }

  // ✅ Toggle active/inactive state
  async function toggleCoupon(id: string, is_active: boolean) {
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !is_active }), // ✅ correct key
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update coupon");

      router.refresh();
    } catch (err) {
      alert((err as Error).message || "Failed to update coupon");
    }
  }

  // ✅ Delete coupon
  async function deleteCoupon(id: string) {
    if (!confirm("Permanently delete this coupon?")) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      const data = await res.json();

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
        <Button
          onClick={handleGenerateCode}
          className="bg-bcs-green hover:bg-bcs-accent"
        >
          + Generate Code
        </Button>
      </div>

      {codes.length === 0 ? (
        <p className="text-gray-500">No coupons yet.</p>
      ) : (
        <table className="w-full text-sm border-t">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Uses</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.code}</td>
                <td className="p-3">{c.discount_percent}%</td>
                <td className="p-3">
                  {c.is_active ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-gray-500 font-medium">Inactive</span>
                  )}
                </td>
                <td className="p-3">{c.usage_count || 0}</td>
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
      )}
    </div>
  );
}
