"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import TipTapEditor from "./TipTapEditor";
import { uploadArticleImage } from "@/lib/uploadArticleImage";
import Button from "@/components/ui/Button";
import { ImageIcon } from "lucide-react";
import type { Article, ArticleCategory, ContentType } from "@/types";

const CATEGORIES: ArticleCategory[] = [
  "News",
  "Music Education",
  "Behind the Scenes",
  "Entertainment",
  "Gist",
  "Gossip",
  "Event Recap",
  "Announcements",
];

interface ArticleFormProps {
  article?: Article;
  isAdmin?: boolean;
  redirectPath: string;
  defaultContentType?: ContentType;
}

export default function ArticleForm({
  article,
  isAdmin,
  redirectPath,
  defaultContentType,
}: ArticleFormProps) {
  const router = useRouter();
  const isEditing = !!article;

  const [contentType, setContentType] = useState<ContentType>(
    article?.content_type || defaultContentType || "article"
  );
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
  const [isRated18, setIsRated18] = useState<boolean | null>(
    article ? article.is_rated_18 : null
  );
  const [penName, setPenName] = useState(article?.pen_name || "");
  const [pastPenNames, setPastPenNames] = useState<string[]>([]);
  const [showPenSuggestions, setShowPenSuggestions] = useState(false);
  const penNameRef = useRef<HTMLDivElement>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Fetch past pen names for poetry
  useEffect(() => {
    if (contentType !== "poetry") return;

    async function loadPenNames() {
      try {
        const res = await fetch("/api/articles/pen-names");
        if (res.ok) {
          const names = await res.json();
          setPastPenNames(names);
        }
      } catch {
        // ignore
      }
    }
    loadPenNames();
  }, [contentType]);

  // Close pen name suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (penNameRef.current && !penNameRef.current.contains(e.target as Node)) {
        setShowPenSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    if (!excerpt.trim()) {
      alert("Please enter an excerpt.");
      return;
    }
    if (!content.trim() || content === "<p></p>") {
      alert("Please write some content.");
      return;
    }
    if (contentType === "article" && !category) {
      alert("Please select a category.");
      return;
    }

    // Cover image is required for submission and publishing
    if (status !== "draft" && !coverImageUrl) {
      alert("Please upload a cover image before submitting.");
      return;
    }

    // Poetry must have 18+ rating confirmed
    if (contentType === "poetry" && isRated18 === null) {
      alert("Please indicate whether this poetry is rated 18+ or not.");
      return;
    }

    // Poetry requires pen name
    if (contentType === "poetry" && !penName.trim()) {
      alert("Please enter a pen name for your poetry.");
      return;
    }

    const body = {
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      category,
      content,
      content_type: contentType,
      is_rated_18: contentType === "poetry" ? (isRated18 ?? false) : false,
      pen_name: contentType === "poetry" ? penName.trim() : null,
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
        throw new Error(data.error || "Failed to save");
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

  const filteredPenSuggestions = pastPenNames.filter(
    (n) => n.toLowerCase().includes(penName.toLowerCase()) && n !== penName
  );

  return (
    <div className="space-y-6">
      {/* Content Type — only when creating */}
      {!isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What are you writing?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setContentType("article");
                setIsRated18(null);
              }}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                contentType === "article"
                  ? "border-bcs-green bg-bcs-green/5 text-bcs-green ring-2 ring-bcs-green/20"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              Article / Blog Post
            </button>
            <button
              type="button"
              onClick={() => setContentType("poetry")}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                contentType === "poetry"
                  ? "border-bcs-green bg-bcs-green/5 text-bcs-green ring-2 ring-bcs-green/20"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              Poetry
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={contentType === "poetry" ? "Poem title" : "Article title"}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-bcs-accent/40 focus:border-bcs-accent transition"
        />
      </div>

      {/* Pen Name — only for poetry */}
      {contentType === "poetry" && (
        <div ref={penNameRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pen Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={penName}
            onChange={(e) => {
              setPenName(e.target.value);
              setShowPenSuggestions(true);
            }}
            onFocus={() => setShowPenSuggestions(true)}
            placeholder="Your pen name for this poem"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-bcs-accent/40 focus:border-bcs-accent transition"
          />
          {showPenSuggestions && filteredPenSuggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              <p className="px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                Previously used
              </p>
              {filteredPenSuggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setPenName(name);
                    setShowPenSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            This will be shown as the author instead of your real name.
          </p>
        </div>
      )}

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Excerpt <span className="text-red-500">*</span>
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Short summary for cards and SEO..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-bcs-accent/40 focus:border-bcs-accent transition resize-none"
        />
      </div>

      {/* Category — only for articles */}
      {contentType === "article" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
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
      )}

      {/* 18+ Rating — only for poetry */}
      {contentType === "poetry" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsRated18(false)}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                isRated18 === false
                  ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              All Ages
            </button>
            <button
              type="button"
              onClick={() => setIsRated18(true)}
              className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                isRated18 === true
                  ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              Rated 18+
            </button>
          </div>
          {isRated18 === null && (
            <p className="text-xs text-gray-400 mt-1">
              You must select an age rating before submitting.
            </p>
          )}
        </div>
      )}

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cover Image <span className="text-red-500">*</span>
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
        <p className="text-xs text-gray-400 mt-1">
          Required for submission.
        </p>
      </div>

      {/* Content Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content <span className="text-red-500">*</span>
        </label>
        <TipTapEditor content={content} onChange={setContent} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
        {isEditing && article.status === "published" && !isAdmin ? (
          /* Member editing a published article — submit for approval */
          <Button
            variant="primary"
            loading={saving}
            onClick={() => saveArticle("draft")}
          >
            Submit Edit for Approval
          </Button>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
