import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { slug } = await params;
  const body = await req.json();
  const { action, rejection_note } = body;

  const validActions = ["publish", "unpublish", "reject", "approve_edit", "reject_edit"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // For approve_edit, we need to fetch the pending_edit data first
  if (action === "approve_edit") {
    const { data: article } = await supabase
      .from("articles")
      .select("pending_edit")
      .eq("slug", slug)
      .single();

    if (!article?.pending_edit) {
      return NextResponse.json({ error: "No pending edit found" }, { status: 400 });
    }

    const edit = article.pending_edit as Record<string, unknown>;

    const { error } = await supabase
      .from("articles")
      .update({
        title: edit.title,
        excerpt: edit.excerpt,
        category: edit.category,
        content: edit.content,
        cover_image_url: edit.cover_image_url,
        cover_image_blur_data: edit.cover_image_blur_data,
        pending_edit: null,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/articles");
    revalidatePath(`/articles/${slug}`);

    return NextResponse.json({ success: true });
  }

  if (action === "reject_edit") {
    const { error } = await supabase
      .from("articles")
      .update({
        pending_edit: null,
        rejection_note: rejection_note || "Edit rejected by admin",
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/articles");
    revalidatePath(`/articles/${slug}`);

    return NextResponse.json({ success: true });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (action === "publish") {
    updateData.status = "published";
    updateData.published_at = new Date().toISOString();
    updateData.rejection_note = null;
    updateData.pending_edit = null;
  } else if (action === "unpublish") {
    updateData.status = "draft";
    updateData.published_at = null;
  } else if (action === "reject") {
    updateData.status = "rejected";
    updateData.rejection_note = rejection_note || "Rejected by admin";
    updateData.published_at = null;
  }

  const { error } = await supabase
    .from("articles")
    .update(updateData)
    .eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/articles");
  revalidatePath(`/articles/${slug}`);

  return NextResponse.json({ success: true });
}
