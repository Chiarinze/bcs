import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = rateLimit(getClientIp(req.headers), {
    key: "ticket-verify",
    limit: 10,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const { reference, event_id, buyer_name, buyer_email, category, coupon_code } =
    await req.json();

  if (!reference || !event_id || !buyer_name || !buyer_email || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
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
        {
          error:
            "Registration for this event has been closed. If you have been charged, please contact the administrator for a refund.",
        },
        { status: 403 }
      );
    }

    if (!event.is_paid) {
      return NextResponse.json(
        { error: "This event does not require payment. Use the free registration flow." },
        { status: 400 }
      );
    }

    // Look up the category server-side — never trust client-supplied price.
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

    // Compute expected amount, applying coupon if present
    let expectedNaira = Number(ticketCategory.price) || 0;
    let validatedCouponCode: string | null = null;

    if (coupon_code) {
      const { data: coupon } = await supabase
        .from("coupon_codes")
        .select("code, discount_percent, is_active, usage_limit, usage_count")
        .eq("event_id", event_id)
        .eq("code", coupon_code)
        .maybeSingle();

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

      expectedNaira = Math.round(expectedNaira * (1 - discount / 100));
      validatedCouponCode = coupon.code;
    }

    if (expectedNaira <= 0) {
      return NextResponse.json(
        { error: "This combination results in a free ticket; use the free registration flow." },
        { status: 400 }
      );
    }

    const expectedKobo = expectedNaira * 100;

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY)
      throw new Error("PAYSTACK_SECRET_KEY not set in environment");

    // Verify payment with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const verifyData = await verifyRes.json();

    if (verifyData.status !== true || verifyData.data?.status !== "success") {
      return NextResponse.json(
        { error: "Payment verification failed or not completed" },
        { status: 400 }
      );
    }

    const paidKobo = Number(verifyData.data.amount);
    if (!Number.isFinite(paidKobo) || paidKobo !== expectedKobo) {
      return NextResponse.json(
        { error: "Payment amount does not match the expected ticket price" },
        { status: 400 }
      );
    }

    // Reject replays — payment_ref should be unique per ticket
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id")
      .eq("payment_ref", reference)
      .maybeSingle();

    if (existingTicket) {
      return NextResponse.json(
        { error: "This payment reference has already been used" },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase.from("tickets").insert([
      {
        event_id,
        buyer_name,
        buyer_email,
        category: ticketCategory.name,
        amount_paid: expectedNaira,
        payment_ref: reference,
        coupon_code: validatedCouponCode,
      },
    ]);

    if (insertError) throw insertError;

    if (validatedCouponCode) {
      await supabase.rpc("increment_coupon_usage", {
        coupon_code_param: validatedCouponCode,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and ticket recorded successfully",
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Payment verification error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
