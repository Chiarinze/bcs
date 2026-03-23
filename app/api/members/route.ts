import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "pending";

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "member")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_verified", false);
  } else if (filter === "verified") {
    query = query.eq("is_verified", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
