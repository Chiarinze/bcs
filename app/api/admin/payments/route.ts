import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

const STATUSES = ["needs_review", "pending", "fulfilled", "failed", "refunded", "dismissed"];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const status = req.nextUrl.searchParams.get("status") ?? "needs_review";
  const supabase = createServerSupabase();

  let query = supabase
    .from("payments")
    .select("reference, kind, status, review_reason, amount_kobo, paid_kobo, email, name, gateway_status, created_at, paid_at, events(title)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (STATUSES.includes(status)) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("Payments list error:", error.message);
    return NextResponse.json({ error: "Could not load payments" }, { status: 500 });
  }

  return NextResponse.json({ payments: data ?? [] });
}
