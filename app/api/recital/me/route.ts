import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { createServerSupabase } from "@/lib/supabaseServer";

// GET: member's current recital state — open query, all bookings, and config
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  const { data: cfg } = await supabase
    .from("recital_config")
    .select("*")
    .eq("id", 1)
    .single();

  // Most recent open or cleared query (prefer open)
  const { data: queries } = await supabase
    .from("recital_queries")
    .select("*")
    .eq("profile_id", auth.id)
    .order("issued_at", { ascending: false });

  const openQuery =
    (queries || []).find((q: { status: string }) => q.status !== "cleared") || null;
  const latestQuery = openQuery || (queries || [])[0] || null;

  let bookings: unknown[] = [];
  if (latestQuery) {
    const { data: b } = await supabase
      .from("recital_bookings")
      .select("*")
      .eq("query_id", latestQuery.id)
      .order("created_at", { ascending: false });
    bookings = b || [];
  }

  return NextResponse.json({
    config: cfg,
    query: latestQuery,
    bookings,
  });
}
