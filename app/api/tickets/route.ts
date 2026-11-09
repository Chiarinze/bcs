// app/api/tickets/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(title)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/tickets:", error.message);
    return NextResponse.json({ error: "Could not load tickets" }, { status: 500 });
  }

  return NextResponse.json(data);
}
