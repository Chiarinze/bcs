import { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabaseServer";
import ArticleCard from "@/components/articles/ArticleCard";
import type { ArticleWithAuthor } from "@/types";
import { FileText } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Read the latest articles, news, and insights from The Benin Chorale & Philharmonic.",
};

export default async function ArticlesPage() {
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("articles")
    .select("*, author:profiles!author_id(first_name, last_name, photo_url)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const articles = (data || []) as ArticleWithAuthor[];

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif text-bcs-green mb-3">
            Articles & Insights
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Stories, news, and insights from our community of musicians and
            music lovers.
          </p>
        </div>

        {/* Articles Grid */}
        {articles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No articles published yet.</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
