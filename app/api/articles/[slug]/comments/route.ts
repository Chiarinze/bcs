import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import sanitizeHtml from "sanitize-html";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyHCaptcha } from "@/lib/hcaptcha";

interface Props {
  params: Promise<{ slug: string }>;
}

const RESERVED_GUEST_NAMES = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "editor",
  "bcs",
  "benin chorale",
  "the benin chorale",
  "noreply",
  "support",
];

function sanitizeText(raw: string) {
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).trim();
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── GET: list comments for an article (member + guest together) ─────
export async function GET(_req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: article } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const { data: comments, error } = await supabase
    .from("article_comments")
    .select(
      "id, article_id, user_id, guest_name, parent_id, content, created_at, updated_at, " +
        "user:profiles!user_id(first_name, last_name, photo_url)"
    )
    .eq("article_id", article.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(comments || []);
}

// ─── POST: add a comment (member or guest) ───────────────────────────
export async function POST(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const supabase = createServerSupabase();
  const ip = getClientIp(req.headers);

  // Shared rate limit: 5 comments per IP per 10 minutes
  const rl = rateLimit(ip, {
    key: "comment_post",
    limit: 5,
    windowSeconds: 600,
  });
  if (rl) return rl;

  const { data: article } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const body = await req.json();
  const rawContent = typeof body.content === "string" ? body.content : "";
  const parentIdRaw = typeof body.parent_id === "string" ? body.parent_id : null;
  const guestName = typeof body.guest_name === "string" ? body.guest_name.trim() : "";
  const hcaptchaToken =
    typeof body.hcaptcha_token === "string" ? body.hcaptcha_token : null;

  const content = sanitizeText(rawContent);
  if (!content) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json(
      { error: "Comment is too long (max 2000 characters)" },
      { status: 400 }
    );
  }

  // Resolve parent_id → enforce one-level threading
  // If client passed a parent that is itself a reply, collapse to its parent.
  let parentId: string | null = null;
  if (parentIdRaw) {
    const { data: parent } = await supabase
      .from("article_comments")
      .select("id, parent_id, article_id")
      .eq("id", parentIdRaw)
      .single();

    if (!parent || parent.article_id !== article.id) {
      return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
    }
    parentId = parent.parent_id ?? parent.id;
  }

  const userId = await getAuthUserId();

  // ─── Member path ────────────────────────────────────────────────────
  if (userId) {
    const { data: comment, error } = await supabase
      .from("article_comments")
      .insert({
        article_id: article.id,
        user_id: userId,
        parent_id: parentId,
        content,
        ip_address: ip !== "unknown" ? ip : null,
      })
      .select(
        "id, article_id, user_id, guest_name, parent_id, content, created_at, updated_at, " +
          "user:profiles!user_id(first_name, last_name, photo_url)"
      )
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(comment, { status: 201 });
  }

  // ─── Guest path ────────────────────────────────────────────────────
  if (!guestName) {
    return NextResponse.json(
      { error: "Please enter a name to comment." },
      { status: 400 }
    );
  }
  if (guestName.length < 2 || guestName.length > 40) {
    return NextResponse.json(
      { error: "Name must be between 2 and 40 characters." },
      { status: 400 }
    );
  }

  const cleanName = sanitizeText(guestName);
  const normalized = normalizeName(cleanName);

  if (RESERVED_GUEST_NAMES.some((n) => normalized === normalizeName(n))) {
    return NextResponse.json(
      { error: "That name is reserved. Please use a different name." },
      { status: 400 }
    );
  }

  // Impersonation check: reject names matching any real member profile
  const { data: impersonation } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .or(
      `first_name.ilike.${cleanName.split(" ")[0]},last_name.ilike.${
        cleanName.split(" ").slice(-1)[0]
      }`
    );

  if (impersonation && impersonation.length > 0) {
    const clash = impersonation.some(
      (p: { first_name: string | null; last_name: string | null }) =>
        normalizeName(`${p.first_name ?? ""} ${p.last_name ?? ""}`) === normalized
    );
    if (clash) {
      return NextResponse.json(
        {
          error:
            "That name matches a registered member. Please log in or use a different name.",
        },
        { status: 400 }
      );
    }
  }

  // Verify hCaptcha for guests
  const captchaOk = await verifyHCaptcha(hcaptchaToken);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 400 }
    );
  }

  // Generate guest edit/delete token
  const plainToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(plainToken);

  const { data: comment, error } = await supabase
    .from("article_comments")
    .insert({
      article_id: article.id,
      user_id: null,
      guest_name: cleanName,
      guest_token_hash: tokenHash,
      parent_id: parentId,
      content,
      ip_address: ip !== "unknown" ? ip : null,
    })
    .select(
      "id, article_id, user_id, guest_name, parent_id, content, created_at, updated_at"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { ...comment, guest_token: plainToken },
    { status: 201 }
  );
}

// ─── PUT: edit own comment ───────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Props) {
  await params;
  const body = await req.json();
  const { id, content: rawContent, guest_token: guestToken } = body;

  if (!id) return NextResponse.json({ error: "Comment ID required" }, { status: 400 });

  const content = sanitizeText(typeof rawContent === "string" ? rawContent : "");
  if (!content) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json(
      { error: "Comment is too long (max 2000 characters)" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  const { data: comment } = await supabase
    .from("article_comments")
    .select("user_id, guest_token_hash, created_at")
    .eq("id", id)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Ownership check
  const userId = await getAuthUserId();
  let allowed = false;

  if (comment.user_id) {
    allowed = !!userId && userId === comment.user_id;
  } else if (comment.guest_token_hash && typeof guestToken === "string") {
    allowed = hashToken(guestToken) === comment.guest_token_hash;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 20-minute edit window (same for members and guests)
  const createdAt = new Date(comment.created_at).getTime();
  if (Date.now() - createdAt > 20 * 60 * 1000) {
    return NextResponse.json(
      { error: "Comments can only be edited within 20 minutes of posting" },
      { status: 403 }
    );
  }

  const { data: updated, error } = await supabase
    .from("article_comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(
      "id, article_id, user_id, guest_name, parent_id, content, created_at, updated_at, " +
        "user:profiles!user_id(first_name, last_name, photo_url)"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}

// ─── DELETE: remove own comment (no time limit) ──────────────────────
export async function DELETE(req: NextRequest, { params }: Props) {
  await params;
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("id");
  const guestToken = searchParams.get("guest_token");

  if (!commentId) {
    return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: comment } = await supabase
    .from("article_comments")
    .select("user_id, guest_token_hash")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const userId = await getAuthUserId();
  const { requireAdmin } = await import("@/lib/requireAdmin");
  const adminCheck = await requireAdmin();
  const isAdmin = !(adminCheck instanceof NextResponse);

  let allowed = isAdmin;
  if (!allowed && comment.user_id) {
    allowed = !!userId && userId === comment.user_id;
  }
  if (!allowed && comment.guest_token_hash && guestToken) {
    allowed = hashToken(guestToken) === comment.guest_token_hash;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("article_comments")
    .delete()
    .eq("id", commentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
