import { createServerSupabase } from "@/lib/supabaseServer";
import EventDashboard from "@/components/admin/EventDashboard";
import AdminLayout from "@/components/layouts/AdminLayout";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const supabase = createServerSupabase();

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error.message);
    return (
      <AdminLayout>
        <div className="p-6 text-red-500">Failed to load events.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <EventDashboard events={events || []} />
    </AdminLayout>
  );
}
