import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate total
  const totalAmount = (data || []).reduce(
    (sum: number, d: { amount?: number }) => sum + (d.amount || 0),
    0
  );

  return NextResponse.json({ donations: data || [], totalAmount });
}
