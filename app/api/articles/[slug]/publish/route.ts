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

  if (!["publish", "unpublish", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (action === "publish") {
    updateData.status = "published";
    updateData.published_at = new Date().toISOString();
    updateData.rejection_note = null;
  } else if (action === "unpublish") {
    updateData.status = "draft";
    updateData.published_at = null;
  } else if (action === "reject") {
    updateData.status = "draft";
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
