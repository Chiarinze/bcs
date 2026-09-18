import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = rateLimit(getClientIp(req.headers), {
    key: "ticket-register",
    limit: 10,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    const { reference, event_id, buyer_name, buyer_email, category, coupon_code, subscribe } =
      await req.json();

    if (!event_id || !buyer_name || !buyer_email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data: event } = await supabase
      .from("events")
      .select("id, is_paid, registration_closed")
      .eq("id", event_id)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.registration_closed) {
      return NextResponse.json(
        { error: "Registration is closed for this event." },
        { status: 403 }
      );
    }

    // Resolve & validate the category server-side
    let resolvedCategoryName = "Free";
    let expectedPrice = 0;

    // Only look up ticket_categories for paid events; free events don't have category rows
    if (category && event.is_paid) {
      const { data: ticketCategory } = await supabase
        .from("ticket_categories")
        .select("name, price")
        .eq("event_id", event_id)
        .eq("name", category)
        .single();

      if (!ticketCategory) {
        return NextResponse.json(
          { error: "Invalid ticket category for this event" },
          { status: 400 }
        );
      }

      resolvedCategoryName = ticketCategory.name;
      expectedPrice = Number(ticketCategory.price) || 0;
    }

    // If a coupon brings the price to zero, apply it here too
    let validatedCouponCode: string | null = null;
    if (coupon_code && expectedPrice > 0) {
      // select("*"): usage_limit is optional in the schema, and naming a
      // missing column makes PostgREST return an error with data = null.
      const { data: coupon, error: couponError } = await supabase
        .from("coupon_codes")
        .select("*")
        .eq("event_id", event_id)
        .eq("code", coupon_code)
        .maybeSingle();

      if (couponError) {
        console.error("Coupon lookup failed:", couponError.message);
        return NextResponse.json(
          { error: "Could not verify the coupon. Please try again." },
          { status: 500 }
        );
      }

      if (!coupon || !coupon.is_active) {
        return NextResponse.json(
          { error: "Invalid or inactive coupon code" },
          { status: 400 }
        );
      }

      if (
        typeof coupon.usage_limit === "number" &&
        typeof coupon.usage_count === "number" &&
        coupon.usage_count >= coupon.usage_limit
      ) {
        return NextResponse.json(
          { error: "Coupon usage limit has been reached" },
          { status: 400 }
        );
      }

      const discount = Number(coupon.discount_percent) || 0;
      if (discount < 0 || discount > 100) {
        return NextResponse.json(
          { error: "Invalid coupon discount" },
          { status: 400 }
        );
      }

      expectedPrice = Math.round(expectedPrice * (1 - discount / 100));
      validatedCouponCode = coupon.code;
    }

    // Free path only applies when the resolved price is zero.
    if (expectedPrice > 0) {
      return NextResponse.json(
        {
          error:
            "This ticket requires payment. Please use the paid checkout flow.",
        },
        { status: 400 }
      );
    }

    if (reference) {
      const { data: existingTicket } = await supabase
        .from("tickets")
        .select("id")
        .eq("payment_ref", reference)
        .maybeSingle();

      if (existingTicket) {
        return NextResponse.json(
          { error: "This reference has already been used" },
          { status: 409 }
        );
      }
    }

    const { error: insertError } = await supabase.from("tickets").insert([
      {
        event_id,
        buyer_name,
        buyer_email,
        amount_paid: 0,
        payment_ref: reference || `FREE-${Date.now()}`,
        category: resolvedCategoryName,
        coupon_code: validatedCouponCode,
      },
    ]);

    if (insertError) throw insertError;

    // Opt-in to the mailing list (checkbox on the purchase form).
    if (subscribe === true) {
      const { error: subError } = await supabase.rpc("upsert_subscriber", {
        p_email: buyer_email,
        p_name: buyer_name,
        p_source: "ticket",
      });
      if (subError) console.error("Failed to add subscriber:", subError.message);
    }

    if (validatedCouponCode) {
      const { error: rpcError } = await supabase.rpc("increment_coupon_usage", {
        coupon_code_param: validatedCouponCode,
      });
      if (rpcError)
        console.error("Failed to update coupon usage:", rpcError.message);
    }

    return NextResponse.json({ success: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Free registration error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
