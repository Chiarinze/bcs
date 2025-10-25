import { createServerSupabase } from "@/lib/supabaseServer";
import AdminLayout from "@/components/layouts/AdminLayout";
import AdminEventDetails from "@/components/admin/AdminEventDetails";
import { notFound } from "next/navigation";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export default async function AdminEventDetailsPage({ params }: Props) {
  const supabase = createServerSupabase();
  const { slug } = params;

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

  return (
    <AdminLayout>
      <AdminEventDetails
        event={event}
        totalTickets={totalTickets || 0}
        categories={categories || []}
        codes={codes || []}
      />
    </AdminLayout>
  );
}
