import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const code = searchParams.get("code");

  if (!event_id || !code) {
    return NextResponse.json({ error: "Missing event_id or code" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("coupon_codes")
    .select("code, discount_percent, is_active")
    .eq("event_id", event_id)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("Coupon validation error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
  }

  if (!data.is_active) {
    return NextResponse.json({ error: "Coupon is inactive" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    discount_percent: data.discount_percent,
  });
}
