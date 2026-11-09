import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";
import { applyCoupon, memberRegistrationRow } from "@/lib/checkout";
import { isEventOver } from "@/lib/pricing";

interface Props {
  params: Promise<{ slug: string }>;
}

// GET: check if current user is registered
export async function GET(_req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: registration } = await supabase
    .from("internal_event_registrations")
    .select("id, created_at")
    .eq("event_id", event.id)
    .eq("user_id", auth.id)
    .maybeSingle();

  return NextResponse.json({ registered: !!registration });
}

// POST: register the current member for a free event, or a paid event fully
// covered by a coupon. Paid registrations go through /api/payments/initialize
// and are created by fulfill_payment once Paystack confirms the money.
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from("events")
    .select("id, is_internal, registration_closed, is_paid, price, date, end_date")
    .eq("slug", slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!event.is_internal) {
    return NextResponse.json({ error: "This is not an internal event" }, { status: 400 });
  }

  if (event.registration_closed || isEventOver(event)) {
    return NextResponse.json({ error: "Registration is closed for this event." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const basePrice = event.is_paid ? Number(event.price) || 0 : 0;

  const quote = await applyCoupon(supabase, event.id, body?.coupon_code, basePrice);
  if (quote.error) return NextResponse.json({ error: quote.error }, { status: 400 });
  if (quote.price > 0) {
    return NextResponse.json({ error: "Payment is required for this event" }, { status: 402 });
  }

  const member = await memberRegistrationRow(supabase, auth.id);
  if ("error" in member) {
    return NextResponse.json({ error: member.error }, { status: member.status });
  }

  const { data: existing } = await supabase
    .from("internal_event_registrations")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", auth.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You are already registered for this event" }, { status: 409 });
  }

  if (quote.code) {
    const { data: redeemed, error: redeemError } = await supabase.rpc("redeem_coupon", {
      p_event_id: event.id,
      p_code: quote.code,
    });
    if (redeemError || !redeemed) {
      return NextResponse.json({ error: "Coupon usage limit has been reached" }, { status: 400 });
    }
  }

  const { error } = await supabase.from("internal_event_registrations").insert({
    ...member.row,
    event_id: event.id,
    user_id: auth.id,
    has_medical_condition: false,
    medical_condition_details: null,
    amount_paid: 0,
    payment_ref: quote.code ? `FREECOUPON-${randomUUID()}` : null,
    coupon_code: quote.code,
  });

  if (error) {
    if (quote.code) await supabase.rpc("release_coupon", { p_event_id: event.id, p_code: quote.code });
    if (error.code === "23505") {
      return NextResponse.json({ error: "You are already registered for this event" }, { status: 409 });
    }
    console.error("Internal registration error:", error.message);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true, amount_paid: 0 }, { status: 201 });
}
