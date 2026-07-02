import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

// GET: read the recital config (admin only)
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { data: config, error } = await supabase
    .from("recital_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config });
}

// PATCH: open or close recital date selection (admin only)
// body: { booking_closed: boolean }
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const booking_closed = Boolean(body?.booking_closed);

  const supabase = createServerSupabase();
  const { data: config, error } = await supabase
    .from("recital_config")
    .update({ booking_closed })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config });
}
