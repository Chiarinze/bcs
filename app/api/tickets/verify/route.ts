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

  const { reference, event_id, buyer_name, buyer_email, category, amount, coupon_code } =
    await req.json();

  if (!reference || !event_id || !buyer_name || !buyer_email || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabase();

    // Block even after payment if the event has registration closed.
    // Admin should close the /purchase page first to avoid reaching this state.
    const { data: event } = await supabase
      .from("events")
      .select("registration_closed")
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

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY)
      throw new Error("PAYSTACK_SECRET_KEY not set in environment");

    // Verify payment with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const verifyData = await verifyRes.json();

    if (verifyData.status !== true || verifyData.data.status !== "success") {
      return NextResponse.json(
        { error: "Payment verification failed or not completed" },
        { status: 400 }
      );
    }

    // Record ticket
    const { error: insertError } = await supabase.from("tickets").insert([
      {
        event_id,
        buyer_name,
        buyer_email,
        category,
        amount_paid: amount,
        payment_ref: reference,
        coupon_code: coupon_code || null,
      },
    ]);

    if (insertError) throw insertError;

    // Increment coupon usage if applicable
    if (coupon_code) {
      await supabase.rpc("increment_coupon_usage", { coupon_code });
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
