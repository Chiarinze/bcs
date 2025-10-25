import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const { event_id, code, discount_percent } = await req.json();

  if (!event_id || !code || !discount_percent) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabase();

    const { data: existing } = await supabase
      .from("coupon_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("coupon_codes").insert([
      {
        event_id,
        code,
        discount_percent,
        is_active: true,
        usage_count: 0,
      },
    ]);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Coupon creation error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
