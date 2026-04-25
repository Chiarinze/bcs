import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// POST: change a member's status (admin only). Only narrow, documented transitions are allowed.
// This endpoint does NOT generate a membership ID — use /api/members/promote for that.
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const target = body?.membership_status;

  const validTargets = ["probationary", "it_student"] as const;
  if (!validTargets.includes(target)) {
    return NextResponse.json(
      {
        error: `Invalid target status. Must be one of: ${validTargets.join(", ")}. Use /api/members/promote to make a member a full member.`,
      },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  const { data: member } = await supabase
    .from("profiles")
    .select("id, role, membership_status, membership_id, closed_at")
    .eq("id", id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.role === "admin") {
    return NextResponse.json(
      { error: "Cannot change status of an admin account" },
      { status: 400 }
    );
  }

  if (member.closed_at) {
    return NextResponse.json(
      { error: "Cannot change status of a closed account. Reopen it first." },
      { status: 400 }
    );
  }

  if (member.membership_id && target === "probationary") {
    return NextResponse.json(
      {
        error:
          "This member already holds a full-member ID and cannot be demoted through this endpoint.",
      },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ membership_status: target })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
