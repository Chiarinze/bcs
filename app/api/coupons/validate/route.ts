import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { applyCoupon } from "@/lib/checkout";

export async function GET(req: NextRequest) {
  // Low limit: this endpoint would otherwise let codes be guessed in bulk.
  const limited = rateLimit(getClientIp(req.headers), {
    key: "coupon-validate",
    limit: 20,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const code = searchParams.get("code");

  if (!event_id || !code) {
    return NextResponse.json({ error: "Missing event_id or code" }, { status: 400 });
  }

  // Same checks as checkout, so a coupon accepted here is accepted there.
  const quote = await applyCoupon(createServerSupabase(), event_id, code, 100);
  if (quote.error) {
    return NextResponse.json({ error: quote.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, discount_percent: quote.discountPercent });
}
