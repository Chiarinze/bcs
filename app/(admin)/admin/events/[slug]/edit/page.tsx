import { createServerSupabase } from "@/lib/supabaseServer";
import EditEventForm from "@/components/admin/EditEventForm";
import AdminLayout from "@/components/layouts/AdminLayout";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export default async function EditEventPage({ params }: Props) {
  const supabase = createServerSupabase();
  const { slug } = params;

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    alert("Error fetching event: " + error.message);
    return (
      <AdminLayout showBack>
        <div className="p-6 text-red-500">Failed to load event.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout showBack>
      <div className="max-w-2xl mx-auto">
        <EditEventForm event={event} />
      </div>
    </AdminLayout>
  );
}
