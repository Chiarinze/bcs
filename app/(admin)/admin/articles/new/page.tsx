import AdminLayout from "@/components/layouts/AdminLayout";
import ArticleForm from "@/components/articles/ArticleForm";
import type { ContentType } from "@/types";

export default async function AdminNewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const defaultContentType: ContentType = type === "poetry" ? "poetry" : "article";

  return (
    <AdminLayout showBack>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-serif text-bcs-green mb-6">
          {defaultContentType === "poetry" ? "New Poetry" : "New Article"}
        </h2>
        <ArticleForm
          isAdmin
          redirectPath="/admin/articles"
          defaultContentType={defaultContentType}
        />
      </div>
    </AdminLayout>
  );
}
