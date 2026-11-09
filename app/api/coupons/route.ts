import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { normalizeCouponCode } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { event_id } = body;
  const code = normalizeCouponCode(body.code);
  const discount = Number(body.discount_percent);
  const usageLimit = body.usage_limit == null || body.usage_limit === "" ? null : Number(body.usage_limit);

  if (!event_id || !code) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
    return NextResponse.json({ error: "Discount must be between 1 and 100" }, { status: 400 });
  }
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    return NextResponse.json({ error: "Usage limit must be a whole number of at least 1" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabase();

    const { data: existing } = await supabase
      .from("coupon_codes")
      .select("id")
      .eq("event_id", event_id)
      .ilike("code", code.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("coupon_codes").insert([
      {
        event_id,
        code,
        discount_percent: discount,
        usage_limit: usageLimit,
        is_active: body.is_active !== false,
        usage_count: 0,
      },
    ]);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Coupon creation error:", (err as Error).message);
    return NextResponse.json({ error: "Could not create the coupon" }, { status: 500 });
  }
}
