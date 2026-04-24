import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";
import {
  FileText,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  Edit,
  BookOpen,
  Eye,
} from "lucide-react";
import type { Article, ArticleWithAuthor } from "@/types";
import DeleteDraftButton from "@/components/articles/DeleteDraftButton";
import ArticleCard from "@/components/articles/ArticleCard";

export const dynamic = "force-dynamic";

type View = "mine" | "articles" | "poetry";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    pending_review: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    published: "Published",
    rejected: "Rejected",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || styles.draft
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export default async function MemberArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view: View =
    rawView === "articles" || rawView === "poetry" ? rawView : "mine";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/member-login");

  const serverSupabase = createServerSupabase();

  let myArticles: Article[] = [];
  let browseItems: ArticleWithAuthor[] = [];

  if (view === "mine") {
    const { data } = await serverSupabase
      .from("articles")
      .select("*")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false });
    myArticles = (data || []) as Article[];
  } else {
    const { data } = await serverSupabase
      .from("articles")
      .select(
        "*, author:profiles!author_id(first_name, last_name, photo_url)"
      )
      .eq("status", "published")
      .eq("content_type", view === "poetry" ? "poetry" : "article")
      .order("published_at", { ascending: false });
    browseItems = (data || []) as ArticleWithAuthor[];
  }

  const tabs: { key: View; label: string; icon: typeof FileText }[] = [
    { key: "mine", label: "My Articles", icon: Edit },
    { key: "articles", label: "Articles", icon: FileText },
    { key: "poetry", label: "Poetry", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif text-bcs-green">Articles</h1>
          <p className="text-sm text-gray-500 mt-1">
            {view === "mine"
              ? "Manage your articles and drafts."
              : view === "poetry"
              ? "Read poetry shared by members."
              : "Read articles and blog posts from members."}
          </p>
        </div>
        {view === "mine" && (
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/articles/new?type=article"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-bcs-green text-white text-sm font-medium hover:bg-bcs-green/90 transition"
            >
              <Plus className="w-4 h-4" /> New Article
            </Link>
            <Link
              href="/dashboard/articles/new?type=poetry"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-bcs-green text-bcs-green text-sm font-medium hover:bg-bcs-green hover:text-white transition"
            >
              <BookOpen className="w-4 h-4" /> New Poetry
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.key;
          const href =
            t.key === "mine" ? "/dashboard/articles" : `/dashboard/articles?view=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-bcs-green text-bcs-green"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      {view === "mine" ? (
        myArticles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">
              You haven&apos;t written any articles yet.
            </p>
            <Link
              href="/dashboard/articles/new"
              className="text-sm text-bcs-accent hover:underline"
            >
              Write your first article
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myArticles.map((article) => {
              const canEdit =
                article.status === "draft" || article.status === "rejected";
              const hasPendingEdit = !!article.pending_edit;

              return (
                <div
                  key={article.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {article.title}
                        </h3>
                        <StatusBadge status={article.status} />
                        {article.content_type === "poetry" && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            Poetry
                          </span>
                        )}
                        {article.is_rated_18 && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-600 text-white">
                            18+
                          </span>
                        )}
                        {hasPendingEdit && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Edit Pending Approval
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
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

                      {article.rejection_note && (
                        <div className="flex items-start gap-2 mt-2 p-3 bg-red-50 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-red-700 mb-0.5">
                              Admin feedback:
                            </p>
                            <p className="text-sm text-red-600">
                              {article.rejection_note}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {article.status === "published" && (
                        <>
                          <Link
                            href={`/dashboard/articles/read/${article.slug}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-bcs-green border border-bcs-green rounded-full hover:bg-bcs-green hover:text-white transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> View
                          </Link>
                          {!hasPendingEdit && (
                            <Link
                              href={`/dashboard/articles/${article.slug}/edit`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-bcs-accent border border-bcs-accent rounded-full hover:bg-bcs-accent hover:text-white transition"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </Link>
                          )}
                        </>
                      )}
                      {article.status !== "published" && (
                        <Link
                          href={`/dashboard/articles/read/${article.slug}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Link>
                      )}
                      {canEdit && (
                        <>
                          <Link
                            href={`/dashboard/articles/${article.slug}/edit`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-bcs-accent border border-bcs-accent rounded-full hover:bg-bcs-accent hover:text-white transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            {article.status === "rejected"
                              ? "Fix & Resubmit"
                              : "Edit"}
                          </Link>
                          {article.status === "draft" && (
                            <DeleteDraftButton slug={article.slug} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : browseItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          {view === "poetry" ? (
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          ) : (
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          )}
          <p className="text-gray-500">
            No {view === "poetry" ? "poetry" : "articles"} published yet.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {browseItems.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              basePath="/dashboard/articles/read"
            />
          ))}
        </div>
      )}
    </div>
  );
}
