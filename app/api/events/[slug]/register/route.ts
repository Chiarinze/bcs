import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";
import { verifyPaystackPayment, applyCoupon } from "@/lib/paystack";

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

// POST: register current user for the event.
// Paid internal events: body { reference, coupon_code? } — the Paystack
// transaction is verified server-side against events.price (less coupon).
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const supabase = createServerSupabase();

  // Get event
  const { data: event } = await supabase
    .from("events")
    .select("id, is_internal, registration_closed, is_paid, price")
    .eq("slug", slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!event.is_internal) {
    return NextResponse.json({ error: "This is not an internal event" }, { status: 400 });
  }

  if (event.registration_closed) {
    return NextResponse.json(
      { error: "Registration is closed for this event." },
      { status: 403 }
    );
  }

  // ---- Payment (paid internal events) ----
  const body = await req.json().catch(() => ({}));
  const basePrice = event.is_paid ? Number(event.price) || 0 : 0;
  let amountPaid = 0;
  let paymentRef: string | null = null;
  let couponCode: string | null = null;

  if (basePrice > 0) {
    const quote = await applyCoupon(supabase, event.id, body?.coupon_code, basePrice);
    if (quote.error) return NextResponse.json({ error: quote.error }, { status: 400 });
    couponCode = quote.code;

    if (quote.price > 0) {
      const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
      if (!reference) {
        return NextResponse.json({ error: "Payment is required for this event" }, { status: 402 });
      }
      const verified = await verifyPaystackPayment(reference, quote.price);
      if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

      const { data: used } = await supabase
        .from("internal_event_registrations")
        .select("id")
        .eq("payment_ref", reference)
        .maybeSingle();
      if (used) return NextResponse.json({ error: "This payment reference has already been used" }, { status: 409 });

      amountPaid = quote.price;
      paymentRef = reference;
    } else {
      // 100% coupon — free registration, still recorded with the code.
      paymentRef = `FREECOUPON-${Date.now()}`;
    }
  }

  // Get member profile (only select columns that exist in the profiles table)
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, other_name, email, physical_address, ensemble_arm, choir_part, orchestra_instrument, year_inducted, membership_status, photo_url, membership_id")
    .eq("id", auth.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.first_name || !profile.last_name) {
    return NextResponse.json({ error: "Please complete your profile first" }, { status: 400 });
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from("internal_event_registrations")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", auth.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You are already registered for this event" }, { status: 409 });
  }

  // Insert registration with profile data
  const { error } = await supabase
    .from("internal_event_registrations")
    .insert({
      event_id: event.id,
      user_id: auth.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      other_name: profile.other_name || null,
      email: profile.email,
      physical_address: profile.physical_address || "",
      ensemble_arm: profile.ensemble_arm || "",
      choir_part: profile.choir_part || null,
      orchestra_instrument: profile.orchestra_instrument || null,
      join_year: profile.year_inducted || new Date().getFullYear(),
      has_medical_condition: false,
      medical_condition_details: null,
      membership_status: profile.membership_status || "probationary",
      passport_url: profile.photo_url || "",
      membership_id: profile.membership_id || null,
      amount_paid: amountPaid,
      payment_ref: paymentRef,
      coupon_code: couponCode,
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You are already registered for this event" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (couponCode) {
    const { error: rpcError } = await supabase.rpc("increment_coupon_usage", { coupon_code_param: couponCode });
    if (rpcError) console.error("Failed to update coupon usage:", rpcError.message);
  }

  return NextResponse.json({ success: true, amount_paid: amountPaid }, { status: 201 });
}
