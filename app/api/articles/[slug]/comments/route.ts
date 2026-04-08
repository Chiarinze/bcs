import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";
import sanitizeHtml from "sanitize-html";

interface Props {
  params: Promise<{ slug: string }>;
}

// GET: list comments for an article
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
    .select("*, user:profiles!user_id(first_name, last_name, photo_url)")
    .eq("article_id", article.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(comments || []);
}

// POST: add a comment
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

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

  const body = await req.json();
  const rawContent = body.content?.trim();

  if (!rawContent) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const content = sanitizeHtml(rawContent, {
    allowedTags: [],
    allowedAttributes: {},
  });

  if (content.length > 2000) {
    return NextResponse.json({ error: "Comment is too long (max 2000 characters)" }, { status: 400 });
  }

  const { data: comment, error } = await supabase
    .from("article_comments")
    .insert({
      article_id: article.id,
      user_id: auth.id,
      content,
    })
    .select("*, user:profiles!user_id(first_name, last_name, photo_url)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(comment, { status: 201 });
}

// PUT: edit own comment (within 20 minutes)
export async function PUT(req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  await params;
  const body = await req.json();
  const { id, content: rawContent } = body;

  if (!id) {
    return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
  }

  if (!rawContent?.trim()) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: comment } = await supabase
    .from("article_comments")
    .select("user_id, created_at")
    .eq("id", id)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.user_id !== auth.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check 20-minute window
  const createdAt = new Date(comment.created_at).getTime();
  const now = Date.now();
  const twentyMinutes = 20 * 60 * 1000;

  if (now - createdAt > twentyMinutes) {
    return NextResponse.json(
      { error: "Comments can only be edited within 20 minutes of posting" },
      { status: 403 }
    );
  }

  const content = sanitizeHtml(rawContent.trim(), {
    allowedTags: [],
    allowedAttributes: {},
  });

  if (content.length > 2000) {
    return NextResponse.json({ error: "Comment is too long (max 2000 characters)" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("article_comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, user:profiles!user_id(first_name, last_name, photo_url)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

// DELETE: delete own comment
export async function DELETE(req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("id");

  if (!commentId) {
    return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: comment } = await supabase
    .from("article_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Only comment owner or admin can delete
  const { requireAdmin } = await import("@/lib/requireAdmin");
  const adminCheck = await requireAdmin();
  const isAdmin = !(adminCheck instanceof NextResponse);

  if (comment.user_id !== auth.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("article_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
