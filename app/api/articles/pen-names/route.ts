import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

// GET: return distinct pen names used by the current user
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("articles")
    .select("pen_name")
    .eq("author_id", auth.id)
    .eq("content_type", "poetry")
    .not("pen_name", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deduplicate
  const unique = [...new Set((data || []).map((r: { pen_name: string }) => r.pen_name))];

  return NextResponse.json(unique);
}
