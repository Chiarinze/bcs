"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  Trash2,
  Pencil,
  Check,
  X,
  User,
  Reply,
} from "lucide-react";
import type { ArticleComment } from "@/types";
import HCaptchaWidget from "@/components/HCaptchaWidget";

interface Props {
  slug: string;
  articleTitle: string;
  articleUrl: string;
  authorId: string;
}

const GUEST_NAME_KEY = "bcs_guest_name";
const GUEST_TOKENS_KEY = "bcs_guest_comment_tokens";

function loadGuestTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GUEST_TOKENS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveGuestToken(commentId: string, token: string) {
  const tokens = loadGuestTokens();
  tokens[commentId] = token;
  try {
    localStorage.setItem(GUEST_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // ignore
  }
}

function removeGuestToken(commentId: string) {
  const tokens = loadGuestTokens();
  delete tokens[commentId];
  try {
    localStorage.setItem(GUEST_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // ignore
  }
}

function isWithinEditWindow(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 20 * 60 * 1000;
}

function displayName(c: ArticleComment) {
  if (c.user_id) {
    const first = c.user?.first_name ?? "";
    const last = c.user?.last_name ?? "";
    const full = `${first} ${last}`.trim();
    return full || "Member";
  }
  return c.guest_name ?? "Guest";
}

export default function ArticleEngagement({
  slug,
  articleTitle,
  articleUrl,
  authorId,
}: Props) {
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Top-level form state
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [topCaptchaToken, setTopCaptchaToken] = useState<string | null>(null);
  const [topCaptchaResetKey, setTopCaptchaResetKey] = useState(0);

  // Reply form state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyCaptchaToken, setReplyCaptchaToken] = useState<string | null>(null);
  const [replyCaptchaResetKey, setReplyCaptchaResetKey] = useState(0);

  // Edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "";

  useEffect(() => {
    fetch(`/api/articles/${slug}/like`)
      .then((r) => r.json())
      .then((data) => {
        setLikeCount(data.count || 0);
        setUserLiked(data.userLiked || false);
      })
      .catch(() => {});

    import("@/lib/supabase/client").then(async ({ createClient }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      setAuthChecked(true);

      if (user?.id !== authorId) {
        const viewedKey = `article_viewed_${slug}`;
        if (!localStorage.getItem(viewedKey)) {
          fetch(`/api/articles/${slug}/view`, { method: "POST" });
          localStorage.setItem(viewedKey, "1");
        }
      }
    });

    // Pre-fill guest name from localStorage
    try {
      const saved = localStorage.getItem(GUEST_NAME_KEY);
      if (saved) setGuestName(saved);
    } catch {
      // ignore
    }
  }, [slug, authorId]);

  const isGuest = authChecked && !currentUserId;

  const topLevelComments = useMemo(
    () => comments.filter((c) => !c.parent_id),
    [comments]
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, ArticleComment[]>();
    for (const c of comments) {
      if (c.parent_id) {
        const list = map.get(c.parent_id) ?? [];
        list.push(c);
        map.set(c.parent_id, list);
      }
    }
    return map;
  }, [comments]);

  async function loadComments() {
    const res = await fetch(`/api/articles/${slug}/comments`);
    if (res.ok) setComments(await res.json());
  }

  async function handleLike() {
    if (likeLoading) return;
    const prevLiked = userLiked;
    const prevCount = likeCount;
    setUserLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/articles/${slug}/like`, { method: "POST" });
      if (!res.ok) {
        setUserLiked(prevLiked);
        setLikeCount(prevCount);
        if (res.status === 401) alert("Please log in to like articles.");
      }
    } catch {
      setUserLiked(prevLiked);
      setLikeCount(prevCount);
    }
    setLikeLoading(false);
  }

  function handleToggleComments() {
    if (!showComments) loadComments();
    setShowComments((v) => !v);
  }

  async function postComment(opts: {
    content: string;
    parentId: string | null;
    captchaToken: string | null;
  }): Promise<ArticleComment | null> {
    const body: Record<string, unknown> = {
      content: opts.content,
    };
    if (opts.parentId) body.parent_id = opts.parentId;
    if (isGuest) {
      const name = guestName.trim();
      if (!name) {
        alert("Please enter your name.");
        return null;
      }
      if (!opts.captchaToken) {
        alert("Please complete the captcha.");
        return null;
      }
      body.guest_name = name;
      body.hcaptcha_token = opts.captchaToken;
    }

    const res = await fetch(`/api/articles/${slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Failed to post comment");
      return null;
    }

    if (isGuest && data.guest_token) {
      saveGuestToken(data.id, data.guest_token);
      try {
        localStorage.setItem(GUEST_NAME_KEY, guestName.trim());
      } catch {
        // ignore
      }
    }

    return data as ArticleComment;
  }

  async function handleAddTopLevel(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);

    const created = await postComment({
      content: commentText.trim(),
      parentId: null,
      captchaToken: topCaptchaToken,
    });

    if (created) {
      setComments((prev) => [...prev, created]);
      setCommentText("");
    }

    // Reset captcha (token is consumed)
    setTopCaptchaToken(null);
    setTopCaptchaResetKey((k) => k + 1);
    setCommentLoading(false);
  }

  async function handleAddReply(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyLoading(true);

    const created = await postComment({
      content: replyText.trim(),
      parentId,
      captchaToken: replyCaptchaToken,
    });

    if (created) {
      setComments((prev) => [...prev, created]);
      setReplyText("");
      setReplyingToId(null);
    }

    setReplyCaptchaToken(null);
    setReplyCaptchaResetKey((k) => k + 1);
    setReplyLoading(false);
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;

    const guestToken = isGuest ? loadGuestTokens()[commentId] : null;
    const qs = new URLSearchParams({ id: commentId });
    if (guestToken) qs.set("guest_token", guestToken);

    const res = await fetch(
      `/api/articles/${slug}/comments?${qs.toString()}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parent_id !== commentId)
      );
      if (guestToken) removeGuestToken(commentId);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to delete comment");
    }
  }

  async function handleEditComment(commentId: string) {
    if (!editText.trim()) return;
    setEditLoading(true);

    const body: Record<string, unknown> = {
      id: commentId,
      content: editText.trim(),
    };
    const guestToken = isGuest ? loadGuestTokens()[commentId] : null;
    if (guestToken) body.guest_token = guestToken;

    const res = await fetch(`/api/articles/${slug}/comments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? updated : c))
      );
      setEditingCommentId(null);
      setEditText("");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to edit comment");
    }
    setEditLoading(false);
  }

  function isOwnComment(c: ArticleComment): boolean {
    if (c.user_id) return currentUserId === c.user_id;
    // Guest comment — we own it if we have its token in localStorage
    return typeof window !== "undefined" && !!loadGuestTokens()[c.id];
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

  function CommentRow({
    comment,
    isReply = false,
  }: {
    comment: ArticleComment;
    isReply?: boolean;
  }) {
    const isAuthor = comment.user_id === authorId;
    const own = isOwnComment(comment);
    const canEdit = own && isWithinEditWindow(comment.created_at);
    const name = displayName(comment);
    const editing = editingCommentId === comment.id;

    return (
      <div className={isReply ? "pl-10 sm:pl-12" : ""}>
        <div className="p-4 border-b border-gray-50">
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{name}</p>
                  {isAuthor && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-bcs-green bg-bcs-green/10 px-1.5 py-0.5 rounded">
                      Author
                    </span>
                  )}
                  {!comment.user_id && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      Guest
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {own && !editing && (
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditText(comment.content);
                        }}
                        className="p-1 text-gray-300 hover:text-bcs-green transition"
                        title="Edit comment"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="mt-1.5">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      disabled={editLoading || !editText.trim()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bcs-green text-white text-xs font-medium hover:bg-bcs-green/90 disabled:opacity-50 transition"
                    >
                      <Check className="w-3 h-3" />
                      {editLoading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditText("");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-gray-500 text-xs font-medium hover:bg-gray-100 transition"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                  {comment.content}
                  {comment.updated_at !== comment.created_at && (
                    <span className="text-xs text-gray-400 ml-1">(edited)</span>
                  )}
                </p>
              )}

              {/* Reply button — only on top-level comments */}
              {!isReply && !editing && (
                <button
                  onClick={() => {
                    setReplyingToId(replyingToId === comment.id ? null : comment.id);
                    setReplyText("");
                    setReplyCaptchaToken(null);
                    setReplyCaptchaResetKey((k) => k + 1);
                  }}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-bcs-green transition"
                >
                  <Reply className="w-3 h-3" />
                  {replyingToId === comment.id ? "Cancel reply" : "Reply"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline reply form */}
        {replyingToId === comment.id && (
          <div className="pl-10 sm:pl-12 pr-4 py-3 bg-gray-50/50 border-b border-gray-50">
            <form
              onSubmit={(e) => handleAddReply(e, comment.id)}
              className="space-y-2"
            >
              {isGuest && (
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  maxLength={40}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                />
              )}
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${displayName(comment)}...`}
                rows={2}
                maxLength={2000}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
              />
              {isGuest && hcaptchaSiteKey && (
                <HCaptchaWidget
                  siteKey={hcaptchaSiteKey}
                  onVerify={setReplyCaptchaToken}
                  onExpire={() => setReplyCaptchaToken(null)}
                  resetKey={replyCaptchaResetKey}
                />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={
                    replyLoading ||
                    !replyText.trim() ||
                    (isGuest && (!guestName.trim() || !replyCaptchaToken))
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bcs-green text-white text-xs font-medium hover:bg-bcs-green/90 disabled:opacity-50 transition"
                >
                  <Send className="w-3 h-3" />
                  {replyLoading ? "Posting..." : "Post reply"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingToId(null);
                    setReplyText("");
                  }}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      {/* Action Bar */}
      <div className="flex items-center gap-4 mb-6">
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
          {/* Top-level comment form */}
          <form
            onSubmit={handleAddTopLevel}
            className="p-4 border-b border-gray-50 space-y-2"
          >
            {isGuest && (
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name"
                maxLength={40}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
              />
            )}
            <div className="flex gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                maxLength={2000}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
              />
              <button
                type="submit"
                disabled={
                  commentLoading ||
                  !commentText.trim() ||
                  (isGuest && (!guestName.trim() || !topCaptchaToken))
                }
                className="self-end p-2.5 rounded-xl bg-bcs-green text-white hover:bg-bcs-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {isGuest && hcaptchaSiteKey && (
              <HCaptchaWidget
                siteKey={hcaptchaSiteKey}
                onVerify={setTopCaptchaToken}
                onExpire={() => setTopCaptchaToken(null)}
                resetKey={topCaptchaResetKey}
              />
            )}
            {isGuest && !hcaptchaSiteKey && (
              <p className="text-xs text-amber-600">
                Captcha is not configured. Ask the site admin to set
                NEXT_PUBLIC_HCAPTCHA_SITE_KEY.
              </p>
            )}
          </form>

          {/* Comments list (one-level threading) */}
          <div>
            {topLevelComments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  No comments yet. Be the first!
                </p>
              </div>
            ) : (
              topLevelComments.map((c) => (
                <div key={c.id}>
                  <CommentRow comment={c} />
                  {(repliesByParent.get(c.id) ?? []).map((reply) => (
                    <CommentRow key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
