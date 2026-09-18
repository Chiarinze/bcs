import AdminLayout from "@/components/layouts/AdminLayout";
import PageLoader from "@/components/ui/PageLoader";

export default function Loading() {
  return (
    <AdminLayout>
      <PageLoader />
    </AdminLayout>
  );
}
