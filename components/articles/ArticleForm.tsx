"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TipTapEditor from "./TipTapEditor";
import { uploadArticleImage } from "@/lib/uploadArticleImage";
import Button from "@/components/ui/Button";
import { ImageIcon } from "lucide-react";
import type { Article, ArticleCategory } from "@/types";

const CATEGORIES: ArticleCategory[] = [
  "News",
  "Music Education",
  "Behind the Scenes",
  "Event Recap",
  "Announcements",
];

interface ArticleFormProps {
  article?: Article;
  isAdmin?: boolean;
  redirectPath: string;
}

export default function ArticleForm({
  article,
  isAdmin,
  redirectPath,
}: ArticleFormProps) {
  const router = useRouter();
  const isEditing = !!article;

  const [title, setTitle] = useState(article?.title || "");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [category, setCategory] = useState<ArticleCategory>(
    article?.category || "News"
  );
  const [content, setContent] = useState(article?.content || "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    article?.cover_image_url || ""
  );
  const [coverBlurData, setCoverBlurData] = useState(
    article?.cover_image_blur_data || ""
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { publicUrl, blurData } = await uploadArticleImage(file);
      setCoverImageUrl(publicUrl);
      setCoverBlurData(blurData || "");
    } catch {
      alert("Failed to upload image.");
    }
    setUploading(false);
  }

  async function saveArticle(status: "draft" | "pending_review" | "published") {
    if (!title.trim()) {
      alert("Please enter a title.");
      return;
    }
    if (!content.trim() || content === "<p></p>") {
      alert("Please write some content.");
      return;
    }

    const body = {
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      category,
      content,
      cover_image_url: coverImageUrl || null,
      cover_image_blur_data: coverBlurData || null,
      status,
    };

    const loadingSetter =
      status === "published"
        ? setPublishing
        : status === "pending_review"
        ? setSubmitting
        : setSaving;

    loadingSetter(true);

    try {
      const url = isEditing
        ? `/api/articles/${article.slug}`
        : "/api/articles";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save article");
      }

      const data = await res.json();

      // If submitting for review after saving, call the submit endpoint
      if (status === "pending_review" && !isAdmin) {
        const slug = isEditing ? article.slug : data.slug;
        await fetch(`/api/articles/${slug}/submit`, { method: "POST" });
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    }

    loadingSetter(false);
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-bcs-accent/40 focus:border-bcs-accent transition"
        />
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Excerpt
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Short summary for cards and SEO..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-bcs-accent/40 focus:border-bcs-accent transition resize-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ArticleCategory)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-bcs-accent/40 focus:border-bcs-accent transition"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cover Image
        </label>
        {coverImageUrl ? (
          <div className="relative rounded-xl overflow-hidden mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt="Cover preview"
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setCoverImageUrl("");
                setCoverBlurData("");
              }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600"
            >
              &times;
            </button>
          </div>
        ) : null}
        <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 cursor-pointer hover:border-bcs-accent transition text-sm text-gray-500">
          <ImageIcon className="w-5 h-5" />
          {uploading ? "Uploading..." : "Choose cover image"}
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {/* Content Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <TipTapEditor content={content} onChange={setContent} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          loading={saving}
          onClick={() => saveArticle("draft")}
        >
          Save Draft
        </Button>

        {!isAdmin && (
          <Button
            variant="primary"
            loading={submitting}
            onClick={() => saveArticle("pending_review")}
          >
            Submit for Review
          </Button>
        )}

        {isAdmin && (
          <Button
            variant="primary"
            loading={publishing}
            onClick={() => saveArticle("published")}
          >
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
