import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const search = searchParams.get("search");

  if (!event_id) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  let query = supabase
    .from("internal_event_registrations")
    .select("*")
    .eq("event_id", event_id)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}