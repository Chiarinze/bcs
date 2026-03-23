import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import AdminLayout from "@/components/layouts/AdminLayout";
import ArticleForm from "@/components/articles/ArticleForm";
import type { Article } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminEditArticlePage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!data) notFound();

  const article = data as Article;

  return (
    <AdminLayout showBack>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-serif text-bcs-green mb-6">Edit Article</h2>
        <ArticleForm
          article={article}
          isAdmin
          redirectPath="/admin/articles"
        />
      </div>
    </AdminLayout>
  );
}
