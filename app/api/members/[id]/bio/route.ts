import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// PATCH: admin edits a member's public bio (used for leadership profiles).
export async function PATCH(req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const raw = body?.bio;

  if (raw !== null && typeof raw !== "string") {
    return NextResponse.json({ error: "Invalid bio" }, { status: 400 });
  }
  const bio = typeof raw === "string" ? raw.trim().slice(0, 2000) : "";

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .update({ bio: bio || null })
    .eq("id", id)
    .eq("role", "member")
    .select("id, bio, slug")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Member not found" }, { status: 404 });
  }

  revalidatePath("/about");
  if (data.slug) revalidatePath(`/about/board/${data.slug}`);
  revalidatePath("/members");

  return NextResponse.json(data);
}
