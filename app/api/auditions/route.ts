import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { sanitizeSearch } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  
  const eventId = searchParams.get("event_id");
  const rawSearch = searchParams.get("search") || "";

  if (!eventId) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  try {
    let query = supabase
      .from("audition_registrations")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    const search = sanitizeSearch(rawSearch);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || [], { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("GET /api/auditions error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}