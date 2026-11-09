// app/admin/coupons/new/page.tsx
import NewCouponForm from "@/components/admin/NewCouponForm";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function NewCouponPage() {
  const { data: events } = await createServerSupabase()
    .from("events")
    .select("id, title")
    .eq("is_paid", true)
    .order("date", { ascending: false });

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create New Coupon</h1>
      <NewCouponForm events={events || []} />
    </div>
  );
}
