import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ArticleForm from "@/components/articles/ArticleForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/member-login");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/articles"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-bcs-green transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Articles
        </Link>
        <h1 className="text-2xl font-serif text-bcs-green">New Article</h1>
        <p className="text-sm text-gray-500 mt-1">
          Write and publish a new article.
        </p>
      </div>
      <ArticleForm redirectPath="/dashboard/articles" />
    </div>
  );
}
