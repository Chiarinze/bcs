import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const choirPart = searchParams.get("choir_part");

  const supabase = createServerSupabase();

  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, photo_url, choir_part")
    .eq("role", "member")
    .eq("profile_completed", true)
    .order("first_name");

  if (choirPart) {
    query = query.eq("choir_part", choirPart);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
