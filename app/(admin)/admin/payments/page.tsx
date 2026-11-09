import AdminLayout from "@/components/layouts/AdminLayout";
import PaymentsList from "@/components/admin/PaymentsList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments | Admin",
};

export default function AdminPaymentsPage() {
  return (
    <AdminLayout>
      <PaymentsList />
    </AdminLayout>
  );
}
