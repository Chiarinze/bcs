import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface PromoteBody {
  member_ids: string[];
  year_inducted: number;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body: PromoteBody = await req.json();
  const { member_ids, year_inducted } = body;

  if (!member_ids?.length || !year_inducted) {
    return NextResponse.json(
      { error: "Missing member_ids or year_inducted" },
      { status: 400 }
    );
  }

  if (year_inducted < 2012 || year_inducted > new Date().getFullYear()) {
    return NextResponse.json(
      { error: "Invalid induction year" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  // Fetch all members to promote — must be verified probationary members
  const { data: members, error: fetchError } = await supabase
    .from("profiles")
    .select("id, email, first_name, membership_status, is_verified, membership_id")
    .in("id", member_ids);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json({ error: "No members found" }, { status: 404 });
  }

  // Validate all members are eligible — verified, probationary or IT student, no existing ID
  const ineligible = members.filter(
    (m: { is_verified: boolean; membership_status: string; membership_id: string | null }) =>
      !m.is_verified ||
      (m.membership_status !== "probationary" && m.membership_status !== "it_student") ||
      m.membership_id !== null
  );

  if (ineligible.length > 0) {
    const names = ineligible.map((m: { first_name: string }) => m.first_name).join(", ");
    return NextResponse.json(
      {
        error: `The following members are not eligible for promotion: ${names}. Members must be verified probationary or IT student members without an existing membership ID.`,
      },
      { status: 400 }
    );
  }

  const results: { id: string; membershipId: string }[] = [];
  const errors: string[] = [];

  // Promote each member sequentially to ensure correct sequential IDs
  for (const member of members) {
    // Generate membership ID
    const { data: membershipId, error: rpcError } = await supabase.rpc(
      "generate_membership_id",
      { p_year: year_inducted }
    );

    if (rpcError || !membershipId) {
      errors.push(
        `Failed to generate ID for ${member.first_name}: ${rpcError?.message || "Unknown error"}`
      );
      continue;
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        membership_status: "full_member",
        year_inducted,
        membership_id: membershipId,
      })
      .eq("id", member.id);

    if (updateError) {
      errors.push(
        `Failed to update ${member.first_name}: ${updateError.message}`
      );
      continue;
    }

    results.push({ id: member.id, membershipId });

    // Promotion email is sent automatically by Supabase pg_net trigger
  }

  return NextResponse.json({
    success: true,
    promoted: results.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
