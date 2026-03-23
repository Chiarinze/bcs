import AdminLayout from "@/components/layouts/AdminLayout";
import ArticleForm from "@/components/articles/ArticleForm";

export default function AdminNewArticlePage() {
  return (
    <AdminLayout showBack>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-serif text-bcs-green mb-6">New Article</h2>
        <ArticleForm isAdmin redirectPath="/admin/articles" />
      </div>
    </AdminLayout>
  );
}
