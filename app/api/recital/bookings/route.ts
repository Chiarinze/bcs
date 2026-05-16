import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { createServerSupabase } from "@/lib/supabaseServer";

// POST: member books a recital slot
// body: { recital_date: "YYYY-MM-DD", chosen_piece: string }
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const recital_date: string = body.recital_date;
  const chosen_piece: string = typeof body.chosen_piece === "string" ? body.chosen_piece.trim() : "";

  if (!recital_date || !/^\d{4}-\d{2}-\d{2}$/.test(recital_date)) {
    return NextResponse.json({ error: "A valid date is required" }, { status: 400 });
  }
  if (!chosen_piece) {
    return NextResponse.json({ error: "Tell us which piece you'll perform" }, { status: 400 });
  }
  if (chosen_piece.length > 500) {
    return NextResponse.json({ error: "Piece name is too long" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Find the member's open query
  const { data: openQuery, error: qErr } = await supabase
    .from("recital_queries")
    .select("id, status")
    .eq("profile_id", auth.id)
    .neq("status", "cleared")
    .maybeSingle();

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  if (!openQuery) {
    return NextResponse.json({ error: "You have no open recital query" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("book_recital_slot", {
    p_query_id: openQuery.id,
    p_profile_id: auth.id,
    p_date: recital_date,
    p_piece: chosen_piece,
  });

  if (error) {
    // Surface helpful messages from the DB function
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: booking } = await supabase
    .from("recital_bookings")
    .select("*")
    .eq("id", data)
    .single();

  return NextResponse.json({ booking }, { status: 201 });
}
