import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerSupabase } from "@/lib/supabaseServer";

// GET: list members eligible to be queried — verified, profile-complete,
// not closed, role = member. Includes a `has_open_query` flag so the
// admin UI can grey out (or hide) members already queried.
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  const { data: members, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, photo_url, ensemble_arm, choir_part"
    )
    .eq("role", "member")
    .eq("is_verified", true)
    .eq("profile_completed", true)
    .is("closed_at", null)
    .order("first_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (members || []).map((m: { id: string }) => m.id);
  const openIds = new Set<string>();
  if (ids.length) {
    const { data: open } = await supabase
      .from("recital_queries")
      .select("profile_id")
      .in("profile_id", ids)
      .neq("status", "cleared");
    for (const row of (open || []) as { profile_id: string }[]) {
      openIds.add(row.profile_id);
    }
  }

  const enriched = (members || []).map((m: { id: string }) => ({
    ...m,
    has_open_query: openIds.has(m.id),
  }));

  return NextResponse.json(enriched);
}
