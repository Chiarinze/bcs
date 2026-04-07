import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

interface Props {
  params: Promise<{ slug: string }>;
}

// GET: check if current user has liked + total count
export async function GET(_req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  // Get article ID
  const { data: article } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Get total likes
  const { count } = await supabase
    .from("article_likes")
    .select("id", { count: "exact", head: true })
    .eq("article_id", article.id);

  // Check if current user liked
  let userLiked = false;
  const auth = await requireAuth();
  if (!(auth instanceof NextResponse)) {
    const { data: like } = await supabase
      .from("article_likes")
      .select("id")
      .eq("article_id", article.id)
      .eq("user_id", auth.id)
      .maybeSingle();

    userLiked = !!like;
  }

  return NextResponse.json({ count: count || 0, userLiked });
}

// POST: toggle like
export async function POST(_req: NextRequest, { params }: Props) {
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

  // Check if already liked
  const { data: existing } = await supabase
    .from("article_likes")
    .select("id")
    .eq("article_id", article.id)
    .eq("user_id", auth.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from("article_likes").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  } else {
    // Like
    await supabase
      .from("article_likes")
      .insert({ article_id: article.id, user_id: auth.id });
    return NextResponse.json({ liked: true });
  }
}
