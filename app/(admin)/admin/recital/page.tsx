import AdminLayout from "@/components/layouts/AdminLayout";
import AdminRecitalClient from "@/components/admin/recital/AdminRecitalClient";

export const dynamic = "force-dynamic";

export default function AdminRecitalPage() {
  return (
    <AdminLayout showBack>
      <AdminRecitalClient />
    </AdminLayout>
  );
}
