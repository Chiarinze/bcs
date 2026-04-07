"use client";

import { useEffect, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  Trash2,
  User,
} from "lucide-react";
import type { ArticleComment } from "@/types";

interface Props {
  slug: string;
  articleTitle: string;
  articleUrl: string;
  authorId: string;
}

export default function ArticleEngagement({ slug, articleTitle, articleUrl, authorId }: Props) {
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch like status
    fetch(`/api/articles/${slug}/like`)
      .then((r) => r.json())
      .then((data) => {
        setLikeCount(data.count || 0);
        setUserLiked(data.userLiked || false);
      })
      .catch(() => {});

    // Get current user ID, then track view if not author
    import("@/lib/supabase/client").then(async ({ createClient }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Track view (once per article per browser, skip if author)
      if (user?.id !== authorId) {
        const viewedKey = `article_viewed_${slug}`;
        if (!localStorage.getItem(viewedKey)) {
          fetch(`/api/articles/${slug}/view`, { method: "POST" });
          localStorage.setItem(viewedKey, "1");
        }
      }
    });
  }, [slug, authorId]);

  async function loadComments() {
    const res = await fetch(`/api/articles/${slug}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
  }

  async function handleLike() {
    if (likeLoading) return;

    // Optimistic update
    const prevLiked = userLiked;
    const prevCount = likeCount;
    setUserLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setLikeLoading(true);

    try {
      const res = await fetch(`/api/articles/${slug}/like`, { method: "POST" });

      if (!res.ok) {
        // Revert on failure
        setUserLiked(prevLiked);
        setLikeCount(prevCount);
        if (res.status === 401) {
          alert("Please log in to like articles.");
        }
      }
    } catch {
      // Revert on network error
      setUserLiked(prevLiked);
      setLikeCount(prevCount);
    }

    setLikeLoading(false);
  }

  function handleToggleComments() {
    if (!showComments) {
      loadComments();
    }
    setShowComments((v) => !v);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommentLoading(true);
    const res = await fetch(`/api/articles/${slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText.trim() }),
    });

    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } else if (res.status === 401) {
      alert("Please log in to comment.");
    } else {
      const data = await res.json();
      alert(data.error || "Failed to post comment");
    }
    setCommentLoading(false);
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;

    const res = await fetch(
      `/api/articles/${slug}/comments?id=${commentId}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(articleTitle);

  const shareLinks = [
    {
      name: "WhatsApp",
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: "hover:text-green-600",
    },
    {
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:text-blue-600",
    },
    {
      name: "X",
      url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: "hover:text-gray-900",
    },
  ];

  function handleCopyLink() {
    navigator.clipboard.writeText(articleUrl);
    alert("Link copied to clipboard!");
    setShowShareMenu(false);
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      {/* Action Bar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Like */}
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${
            userLiked
              ? "bg-red-50 text-red-600"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Heart className={`w-4 h-4 ${userLiked ? "fill-red-500" : ""}`} />
          {likeCount > 0 ? likeCount : "Like"}
        </button>

        {/* Comments toggle */}
        <button
          onClick={handleToggleComments}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${
            showComments
              ? "bg-bcs-green/10 text-bcs-green"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          {comments.length > 0 ? `${comments.length} Comments` : "Comment"}
        </button>

        {/* Share */}
        <div className="relative">
          <button
            onClick={() => setShowShareMenu((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          {showShareMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowShareMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                {shareLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className={`block px-4 py-2 text-sm text-gray-600 ${link.color} hover:bg-gray-50 transition`}
                  >
                    {link.name}
                  </a>
                ))}
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-bcs-green hover:bg-gray-50 transition"
                >
                  Copy link
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="p-4 border-b border-gray-50">
            <div className="flex gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={currentUserId ? "Write a comment..." : "Log in to comment"}
                disabled={!currentUserId}
                rows={2}
                maxLength={2000}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-bcs-green/30 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="submit"
                disabled={commentLoading || !commentText.trim() || !currentUserId}
                className="self-end p-2.5 rounded-xl bg-bcs-green text-white hover:bg-bcs-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="divide-y divide-gray-50">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {comment.user?.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.user.photo_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-bcs-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-bcs-green" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.user?.first_name} {comment.user?.last_name}
                          </p>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.created_at).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {currentUserId === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
