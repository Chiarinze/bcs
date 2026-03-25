import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import ArticleForm from "@/components/articles/ArticleForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Article } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditArticlePage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/member-login");

  const serverSupabase = createServerSupabase();
  const { data } = await serverSupabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("author_id", user.id)
    .single();

  if (!data) notFound();

  const article = data as Article;

  if (article.status === "published") {
    redirect("/dashboard/articles");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/articles"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-bcs-green transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Articles
        </Link>
        <h1 className="text-2xl font-serif text-bcs-green">Edit Article</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update your article draft.
        </p>
      </div>
      <ArticleForm article={article} redirectPath="/dashboard/articles" />
    </div>
  );
}
