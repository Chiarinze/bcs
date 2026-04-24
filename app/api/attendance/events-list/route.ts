import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

// GET: list currently running + upcoming internal events for the attendance dropdown
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const today = new Date().toISOString().split("T")[0];

  // An event is "current or upcoming" if:
  //   end_date (if set) >= today, OR
  //   date >= today (no end_date)
  const { data, error } = await supabase
    .from("events")
    .select("id, title, slug, date, end_date")
    .eq("is_internal", true)
    .or(`end_date.gte.${today},and(end_date.is.null,date.gte.${today})`)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
