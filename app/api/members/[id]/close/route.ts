import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// POST: close a member's account (admin only)
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = createServerSupabase();

  const body = await req.json().catch(() => ({}));
  const reason: string | null =
    typeof body?.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : null;

  const { data: member } = await supabase
    .from("profiles")
    .select("id, role, closed_at")
    .eq("id", id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts cannot be closed" },
      { status: 400 }
    );
  }

  if (member.closed_at) {
    return NextResponse.json(
      { error: "Account is already closed" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      closed_at: new Date().toISOString(),
      closure_reason: reason,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Closure email goes out automatically via the `on_account_closed` trigger
  return NextResponse.json({ success: true });
}
