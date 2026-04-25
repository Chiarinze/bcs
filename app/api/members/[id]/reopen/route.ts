import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// POST: reopen a closed account (admin only, within 30 days of closure)
export async function POST(_req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: member } = await supabase
    .from("profiles")
    .select("id, closed_at")
    .eq("id", id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.closed_at) {
    return NextResponse.json(
      { error: "Account is not closed" },
      { status: 400 }
    );
  }

  // Sanity check the 30-day window (auto-delete cron runs at 02:00 daily)
  const closedAt = new Date(member.closed_at).getTime();
  if (Date.now() - closedAt > 30 * 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      {
        error:
          "This account is past the 30-day grace period and cannot be reopened.",
      },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ closed_at: null, closure_reason: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
