"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/layouts/AdminLayout";
import Button from "@/components/ui/Button";
import {
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import type { ArticleWithAuthor } from "@/types";

export default function AdminArticleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<ArticleWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    async function fetchArticle() {
      const res = await fetch(`/api/articles/${slug}`);
      if (res.ok) {
        setArticle(await res.json());
      }
      setLoading(false);
    }
    fetchArticle();
  }, [slug]);

  async function handlePublishAction(action: "publish" | "unpublish" | "reject") {
    setActionLoading(true);
    const body: Record<string, string> = { action };
    if (action === "reject") {
      body.rejection_note = rejectionNote || "Rejected by admin";
    }

    const res = await fetch(`/api/articles/${slug}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/admin/articles");
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Action failed");
    }
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this article?")) return;
    setActionLoading(true);

    const res = await fetch(`/api/articles/${slug}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/articles");
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Delete failed");
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <AdminLayout showBack>
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 border-3 border-bcs-green border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!article) {
    return (
      <AdminLayout showBack>
        <div className="text-center py-20 text-gray-500">
          Article not found.
        </div>
      </AdminLayout>
    );
  }

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    published: "Published",
  };

  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    pending_review: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
  };

  return (
    <AdminLayout showBack>
      <div className="space-y-6">
        {/* Article Meta */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-serif text-gray-900">
                  {article.title}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    statusStyles[article.status]
                  }`}
                >
                  {statusLabels[article.status]}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {article.author?.first_name} {article.author?.last_name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  {article.category}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(article.updated_at).toLocaleDateString("en-NG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {article.excerpt && (
                <p className="text-sm text-gray-500 italic mt-2">
                  {article.excerpt}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Actions</h3>
          <div className="flex flex-wrap items-center gap-3">
            {(article.status === "pending_review" ||
              article.status === "draft") && (
              <Button
                variant="primary"
                loading={actionLoading}
                onClick={() => handlePublishAction("publish")}
                className="flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" /> Publish
              </Button>
            )}

            {article.status === "published" && (
              <Button
                variant="outline"
                loading={actionLoading}
                onClick={() => handlePublishAction("unpublish")}
                className="flex items-center gap-1"
              >
                <EyeOff className="w-4 h-4" /> Unpublish
              </Button>
            )}

            {article.status === "pending_review" && !showRejectForm && (
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                className="flex items-center gap-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
              >
                <XCircle className="w-4 h-4" /> Reject
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() =>
                router.push(`/admin/articles/${article.slug}/edit`)
              }
              className="flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Edit
            </Button>

            {article.status === "published" && (
              <a
                href={`/articles/${article.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-4 py-2 text-sm text-bcs-green border border-bcs-green rounded-full hover:bg-bcs-green hover:text-white transition"
              >
                <Eye className="w-4 h-4" /> View Public
              </a>
            )}

            <Button
              variant="danger"
              loading={actionLoading}
              onClick={handleDelete}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>

          {/* Rejection Form */}
          {showRejectForm && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-xl space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Rejection Note (optional)
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Explain why this article is being rejected..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 transition resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  loading={actionLoading}
                  onClick={() => handlePublishAction("reject")}
                >
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionNote("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Cover Image Preview */}
        {article.cover_image_url && (
          <div className="rounded-2xl overflow-hidden border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover_image_url}
              alt="Cover"
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Article Content Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-4 border-b border-gray-100">
            Content Preview
          </h3>
          <div
            className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-gray-900 prose-a:text-bcs-accent prose-img:rounded-xl prose-blockquote:border-bcs-green/30"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
