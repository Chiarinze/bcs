import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

const COLUMNS =
  "id, first_name, last_name, photo_url, membership_status, directory_hidden, directory_request, directory_request_at, directory_request_note";

// GET: pending visibility requests + members currently hidden
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const supabase = createServerSupabase();
  const [{ data: pending, error: e1 }, { data: hidden, error: e2 }] = await Promise.all([
    supabase
      .from("profiles")
      .select(COLUMNS)
      .eq("role", "member")
      .not("directory_request", "is", null)
      .order("directory_request_at", { ascending: true }),
    supabase
      .from("profiles")
      .select(COLUMNS)
      .eq("role", "member")
      .eq("directory_hidden", true)
      .order("first_name"),
  ]);

  if (e1 || e2) {
    return NextResponse.json({ error: (e1 || e2)!.message }, { status: 500 });
  }
  return NextResponse.json({ pending: pending || [], hidden: hidden || [] });
}
