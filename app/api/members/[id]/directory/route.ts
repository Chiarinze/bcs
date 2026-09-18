import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// POST: admin decides a member's directory visibility.
// Body: { action: "approve" | "reject" | "hide" | "show" }
//   approve/reject → resolve the member's pending request
//   hide/show      → set visibility directly (no request needed)
export async function POST(req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (!["approve", "reject", "hide", "show"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: member } = await supabase
    .from("profiles")
    .select("id, slug, directory_hidden, directory_request")
    .eq("id", id)
    .eq("role", "member")
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  let hidden = member.directory_hidden;
  if (action === "approve") {
    if (!member.directory_request) {
      return NextResponse.json({ error: "No pending request" }, { status: 400 });
    }
    hidden = member.directory_request === "hide";
  } else if (action === "hide") {
    hidden = true;
  } else if (action === "show") {
    hidden = false;
  }
  // "reject" leaves visibility as-is; clearing the request is what tells the
  // decision trigger to send the "declined" email.

  const { error } = await supabase
    .from("profiles")
    .update({
      directory_hidden: hidden,
      directory_request: null,
      directory_request_at: null,
      directory_request_note: null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/members");
  if (member.slug) revalidatePath(`/members/${member.slug}`);

  return NextResponse.json({ success: true, directory_hidden: hidden });
}
