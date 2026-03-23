import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import type { MembershipStatus } from "@/types";

interface VerifyBody {
  member_id: string;
  action: "approve" | "reject";
  membership_status?: MembershipStatus;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body: VerifyBody = await req.json();
  const { member_id, action, membership_status } = body;

  if (!member_id || !action) {
    return NextResponse.json(
      { error: "Missing member_id or action" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  if (action === "approve") {
    const updateData: Record<string, unknown> = { is_verified: true };

    if (membership_status) {
      updateData.membership_status = membership_status;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", member_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Member approved" });
  }

  if (action === "reject") {
    // Delete the profile and the auth user
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", member_id);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    // Delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(
      member_id
    );

    if (authError) {
      console.error("Failed to delete auth user:", authError.message);
    }

    return NextResponse.json({ success: true, message: "Member rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
