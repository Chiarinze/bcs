import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerSupabase } from "@/lib/supabaseServer";
import { RECITAL_MAX_PER_CRITERION, RECITAL_RUBRIC } from "@/lib/recital";

// POST: record rubric scores for a booking
//   body: { score_diction, score_costume, score_vocal_production,
//           score_accompaniment, score_expression, notes? }
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  // Validate every rubric criterion
  const values: Record<string, number> = {};
  for (const c of RECITAL_RUBRIC) {
    const raw = body[c.key];
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > RECITAL_MAX_PER_CRITERION) {
      return NextResponse.json(
        { error: `${c.label} must be an integer between 0 and ${RECITAL_MAX_PER_CRITERION}` },
        { status: 400 }
      );
    }
    values[c.key] = n;
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : null;
  const supabase = createServerSupabase();

  // Verify booking exists and is still scheduled (don't allow re-scoring)
  const { data: booking, error: fetchErr } = await supabase
    .from("recital_bookings")
    .select("id, status")
    .eq("id", id)
    .single();
  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status !== "scheduled") {
    return NextResponse.json(
      { error: "This booking has already been scored" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase.rpc("score_recital_booking", {
    p_booking_id: id,
    p_scorer_id: auth.id,
    p_score_diction: values.score_diction,
    p_score_costume: values.score_costume,
    p_score_vocal_production: values.score_vocal_production,
    p_score_accompaniment: values.score_accompaniment,
    p_score_expression: values.score_expression,
    p_notes: notes,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ booking: data });
}
