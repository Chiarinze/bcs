import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerSupabase } from "@/lib/supabaseServer";

// GET: list all recital queries with member info + latest booking
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  const { data: queries, error } = await supabase
    .from("recital_queries")
    .select(
      "*, profile:profiles!profile_id(id, first_name, last_name, email, photo_url, ensemble_arm, choir_part)"
    )
    .order("issued_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const queryIds = (queries || []).map((q: { id: string }) => q.id);
  const bookingsByQuery: Record<string, unknown> = {};
  if (queryIds.length) {
    const { data: bookings } = await supabase
      .from("recital_bookings")
      .select("*")
      .in("query_id", queryIds)
      .order("created_at", { ascending: false });

    for (const b of (bookings || []) as { query_id: string }[]) {
      // Take only the latest per query (already sorted desc)
      if (!(b.query_id in bookingsByQuery)) {
        bookingsByQuery[b.query_id] = b;
      }
    }
  }

  const enriched = (queries || []).map((q: { id: string }) => ({
    ...q,
    latest_booking: bookingsByQuery[q.id] || null,
  }));

  return NextResponse.json(enriched);
}

// POST: issue recital queries
// Body:
//   { all: true }                     → query every eligible member without an open query
//   { profile_ids: ["uuid", ...] }    → query the listed members (skipping any with open query)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const body = await req.json().catch(() => ({}));

  const all = body.all === true;
  const requestedIds: string[] = Array.isArray(body.profile_ids)
    ? body.profile_ids.filter((x: unknown): x is string => typeof x === "string")
    : [];

  if (!all && requestedIds.length === 0) {
    return NextResponse.json(
      { error: "Provide either { all: true } or { profile_ids: [...] }" },
      { status: 400 }
    );
  }

  // Eligible members: verified, profile completed, not closed, role = member
  let eligibleQuery = supabase
    .from("profiles")
    .select("id")
    .eq("is_verified", true)
    .eq("profile_completed", true)
    .eq("role", "member")
    .is("closed_at", null);

  if (!all) {
    eligibleQuery = eligibleQuery.in("id", requestedIds);
  }

  const { data: eligible, error: eligibleErr } = await eligibleQuery;
  if (eligibleErr) {
    return NextResponse.json({ error: eligibleErr.message }, { status: 500 });
  }

  const eligibleIds = (eligible || []).map((p: { id: string }) => p.id);
  if (eligibleIds.length === 0) {
    return NextResponse.json({ issued: 0, skipped: 0, total_eligible: 0 });
  }

  // Skip anyone who already has an open (pending/booked) query
  const { data: openQueries } = await supabase
    .from("recital_queries")
    .select("profile_id")
    .in("profile_id", eligibleIds)
    .neq("status", "cleared");

  const openSet = new Set(
    (openQueries || []).map((q: { profile_id: string }) => q.profile_id)
  );
  const toIssue = eligibleIds.filter((id: string) => !openSet.has(id));

  if (toIssue.length === 0) {
    return NextResponse.json({
      issued: 0,
      skipped: eligibleIds.length,
      total_eligible: eligibleIds.length,
    });
  }

  const rows = toIssue.map((profile_id: string) => ({
    profile_id,
    issued_by: auth.id,
  }));

  const { error: insertErr } = await supabase
    .from("recital_queries")
    .insert(rows);

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    issued: toIssue.length,
    skipped: eligibleIds.length - toIssue.length,
    total_eligible: eligibleIds.length,
  });
}
