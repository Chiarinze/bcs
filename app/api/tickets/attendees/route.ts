import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { sanitizeSearch } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  if (!event_id) {
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = createServerSupabase();

  let query = supabase
    .from("tickets")
    .select("*", { count: "exact" })
    .eq("event_id", event_id);

  // Apply search by name or email (case-insensitive)
  const sanitized = sanitizeSearch(search);
  if (sanitized !== "") {
    query = query.or(
      `buyer_name.ilike.%${sanitized}%,buyer_email.ilike.%${sanitized}%`
    );
  }

  // Filter by category if provided
  if (category.trim() !== "") {
    query = query.eq("category", category.trim());
  }

  // Apply pagination
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Attendees fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalPages = Math.ceil((count || 0) / limit);

  return NextResponse.json({
    attendees: data || [],
    totalPages,
    totalCount: count || 0,
  });
}
