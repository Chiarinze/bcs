import NewEventForm from "@/components/admin/NewEventForm";
import AdminLayout from "@/components/layouts/AdminLayout";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <AdminLayout showBack>
      <div className="max-w-2xl mx-auto">
        <NewEventForm />
      </div>
    </AdminLayout>
  );
}
