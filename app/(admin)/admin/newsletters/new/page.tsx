import AdminLayout from "@/components/layouts/AdminLayout";
import NewsletterComposer from "@/components/admin/NewsletterComposer";

export default function NewNewsletterPage() {
  return (
    <AdminLayout showBack>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New newsletter</h1>
        <NewsletterComposer />
      </div>
    </AdminLayout>
  );
}
