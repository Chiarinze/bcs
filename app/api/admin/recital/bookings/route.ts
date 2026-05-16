import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerSupabase } from "@/lib/supabaseServer";

// GET: list bookings, optionally filtered by date or status
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");

  let q = supabase
    .from("recital_bookings")
    .select(
      "*, profile:profiles!profile_id(id, first_name, last_name, email, photo_url, ensemble_arm, choir_part)"
    )
    .order("recital_date", { ascending: true })
    .order("slot_number", { ascending: true });

  if (date) q = q.eq("recital_date", date);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}
