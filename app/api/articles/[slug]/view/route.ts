import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function POST(_req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { error } = await supabase.rpc("increment_view_count", {
    article_slug: slug,
  });

  if (error) {
    // Fallback: manual increment if RPC doesn't exist yet
    const { data: article } = await supabase
      .from("articles")
      .select("id, view_count")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (article) {
      await supabase
        .from("articles")
        .update({ view_count: (article.view_count || 0) + 1 })
        .eq("id", article.id);
    }
  }

  return NextResponse.json({ success: true });
}
