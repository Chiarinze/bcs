import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function POST(_req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: article } = await supabase
    .from("articles")
    .select("author_id, status")
    .eq("slug", slug)
    .single();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  if (article.author_id !== auth.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (article.status !== "draft" && article.status !== "rejected") {
    return NextResponse.json(
      { error: "Only drafts and rejected articles can be submitted for review" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("articles")
    .update({
      status: "pending_review",
      rejection_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
