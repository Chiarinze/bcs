import AdminLayout from "@/components/layouts/AdminLayout";
import { createServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";
import { FileText, Plus, Clock, Eye, Edit } from "lucide-react";
import type { ArticleWithAuthor, ArticleStatus } from "@/types";

export const dynamic = "force-dynamic";

type FilterType = "all" | "pending_review" | "published" | "draft";

function StatusBadge({ status }: { status: ArticleStatus }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    pending_review: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    published: "Published",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter: FilterType =
    rawFilter === "pending_review" ||
    rawFilter === "published" ||
    rawFilter === "draft"
      ? rawFilter
      : "all";

  const supabase = createServerSupabase();

  let query = supabase
    .from("articles")
    .select("*, author:profiles!author_id(first_name, last_name, photo_url)")
    .order("updated_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data } = await query;
  const articles = (data || []) as ArticleWithAuthor[];

  // Count pending for badge
  const { count: pendingCount } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "pending_review", label: "Pending Review", count: pendingCount || 0 },
    { key: "published", label: "Published" },
    { key: "draft", label: "Drafts" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-bcs-green" />
            <h2 className="text-xl font-semibold text-bcs-green">Articles</h2>
          </div>
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-bcs-green text-white text-sm font-medium hover:bg-bcs-green/90 transition"
          >
            <Plus className="w-4 h-4" /> New Article
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={`/admin/articles?filter=${f.key}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition inline-flex items-center gap-1.5 ${
                filter === f.key
                  ? "bg-bcs-green text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    filter === f.key
                      ? "bg-white/20 text-white"
                      : "bg-yellow-200 text-yellow-800"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Articles List */}
        {articles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No articles found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {article.title}
                      </h3>
                      <StatusBadge status={article.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>
                        By {article.author?.first_name}{" "}
                        {article.author?.last_name}
                      </span>
                      <span>&middot;</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(article.updated_at).toLocaleDateString(
                          "en-NG",
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">
                        {article.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/articles/${article.slug}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-bcs-green border border-bcs-green rounded-full hover:bg-bcs-green hover:text-white transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </Link>
                    <Link
                      href={`/admin/articles/${article.slug}/edit`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-bcs-accent border border-bcs-accent rounded-full hover:bg-bcs-accent hover:text-white transition"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
