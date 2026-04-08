import { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabaseServer";
import ArticleCard from "@/components/articles/ArticleCard";
import type { ArticleWithAuthor } from "@/types";
import { FileText, BookOpen } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Articles & Poetry",
  description:
    "Read the latest articles, blog posts, and poetry from The Benin Chorale & Philharmonic.",
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "poetry" ? "poetry" : "articles";

  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("articles")
    .select("*, author:profiles!author_id(first_name, last_name, photo_url)")
    .eq("status", "published")
    .eq("content_type", tab === "poetry" ? "poetry" : "article")
    .order("published_at", { ascending: false });

  const items = (data || []) as ArticleWithAuthor[];

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif text-bcs-green mb-3">
            Articles & Poetry
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Stories, news, insights, and poetry from our community of musicians
            and music lovers.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex gap-1 bg-gray-100 rounded-xl p-1">
            <Link
              href="/articles?tab=articles"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === "articles"
                  ? "bg-white text-bcs-green shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="w-4 h-4" />
              Articles & Blog Posts
            </Link>
            <Link
              href="/articles?tab=poetry"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === "poetry"
                  ? "bg-white text-bcs-green shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Poetry
            </Link>
          </div>
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            {tab === "poetry" ? (
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            ) : (
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            )}
            <p className="text-gray-500">
              No {tab === "poetry" ? "poetry" : "articles"} published yet.
            </p>
            <p className="text-sm text-gray-400 mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
