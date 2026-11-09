import { createServerSupabase } from "@/lib/supabaseServer";
import AdminLayout from "@/components/layouts/AdminLayout";
import AdminEventDetails from "@/components/admin/AdminEventDetails";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminEventDetailsPage({ params }: Props) {
  const supabase = createServerSupabase();
  const { slug } = await params;

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (eventError || !event) notFound();

  // Fetch stats
  const { count: totalTickets } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  const { data: categories } = await supabase
    .from("ticket_categories")
    .select("id, name, price")
    .eq("event_id", event.id);

  const { data: codes } = await supabase
    .from("coupon_codes")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  // Coupon uses held by checkouts that haven't been paid yet.
  const { data: holds } = await supabase
    .from("payments")
    .select("details")
    .eq("event_id", event.id)
    .eq("status", "pending")
    .eq("coupon_held", true);

  const heldCoupons: Record<string, number> = {};
  for (const h of holds || []) {
    const code = (h.details as { coupon_code?: string } | null)?.coupon_code;
    if (code) heldCoupons[code] = (heldCoupons[code] ?? 0) + 1;
  }

  return (
    <AdminLayout>
      <AdminEventDetails
        event={event}
        totalTickets={totalTickets || 0}
        categories={categories || []}
        codes={codes || []}
        heldCoupons={heldCoupons}
      />
    </AdminLayout>
  );
}
