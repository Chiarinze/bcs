import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import ArticleForm from "@/components/articles/ArticleForm";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";
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
    <div className="min-h-screen bg-[#F9F9F7]">
      <header className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow">
              <Image src={IMAGES.logo} alt="BCS logo" width={40} height={40} />
            </div>
            <h1 className="text-lg font-semibold text-bcs-green">
              Edit Article
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/articles"
              className="text-sm text-gray-500 hover:text-bcs-green transition"
            >
              My Articles
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <ArticleForm article={article} redirectPath="/dashboard/articles" />
      </main>
    </div>
  );
}
