import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { createServerSupabase } from "@/lib/supabaseServer";

// PATCH: member changes their scheduled booking
// body: { recital_date?: string, chosen_piece?: string }
//
// Only allowed while booking.status = 'scheduled' AND we're at least 24h
// before the current recital_date. Date change re-runs the slot-picker.
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const new_date: string | undefined = body.recital_date;
  const new_piece: string | undefined =
    typeof body.chosen_piece === "string" ? body.chosen_piece.trim() : undefined;

  if (!new_date && !new_piece) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (new_date && !/^\d{4}-\d{2}-\d{2}$/.test(new_date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (new_piece !== undefined && (new_piece.length === 0 || new_piece.length > 500)) {
    return NextResponse.json({ error: "Invalid piece" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: booking, error: fetchErr } = await supabase
    .from("recital_bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.profile_id !== auth.id) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }
  if (booking.status !== "scheduled") {
    return NextResponse.json(
      { error: "This booking is already scored and cannot be changed" },
      { status: 409 }
    );
  }

  // No edits within 24h of the current date
  const currentDateMs = new Date(booking.recital_date + "T00:00:00").getTime();
  const cutoffMs = Date.now() + 24 * 60 * 60 * 1000;
  if (currentDateMs <= cutoffMs) {
    return NextResponse.json(
      { error: "Changes are locked within 24 hours of your recital" },
      { status: 409 }
    );
  }

  // If only changing piece, do a direct update.
  if (!new_date || new_date === booking.recital_date) {
    if (!new_piece) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const { data: updated, error: updErr } = await supabase
      .from("recital_bookings")
      .update({ chosen_piece: new_piece })
      .eq("id", id)
      .select("*")
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ booking: updated });
  }

  // Changing date: cancel + rebook through the RPC so slot assignment + caps stay race-safe.
  // Delete the old booking first (the DB enforces only one scheduled booking per query).
  const { error: delErr } = await supabase
    .from("recital_bookings")
    .delete()
    .eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const piece = new_piece || booking.chosen_piece;
  const { data: newId, error: bookErr } = await supabase.rpc("book_recital_slot", {
    p_query_id: booking.query_id,
    p_profile_id: auth.id,
    p_date: new_date,
    p_piece: piece,
  });

  if (bookErr) {
    // Best-effort: re-insert the prior booking so the member isn't left orphaned.
    await supabase.from("recital_bookings").insert({
      id: booking.id,
      query_id: booking.query_id,
      profile_id: booking.profile_id,
      recital_date: booking.recital_date,
      slot_number: booking.slot_number,
      chosen_piece: booking.chosen_piece,
      status: "scheduled",
    });
    return NextResponse.json({ error: bookErr.message }, { status: 400 });
  }

  const { data: fresh } = await supabase
    .from("recital_bookings")
    .select("*")
    .eq("id", newId)
    .single();

  return NextResponse.json({ booking: fresh });
}
