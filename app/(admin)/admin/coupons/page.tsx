// app/admin/coupons/page.tsx
import CouponList from "@/components/admin/CouponList";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const supabase = createServerSupabase();
  const { data: coupons, error } = await supabase
  .from("coupons")
  .select("*")
  .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching coupons:", error);
    return <div className="p-6 text-red-500">Failed to load coupons.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <a
          href="/admin/coupons/new"
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          + New Coupon
        </a>
      </div>
      <CouponList coupons={coupons || []} />
    </div>
  );
}
