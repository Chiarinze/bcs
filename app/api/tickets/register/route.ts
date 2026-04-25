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
    const {
      reference,
      event_id,
      buyer_name,
      buyer_email,
      category,
      amount,
      coupon_code, // ✅ include coupon_code if available
    } = await req.json();

    if (!event_id || !buyer_name || !buyer_email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // Block free registration when the event has registration closed
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
        { error: "Registration is closed for this event." },
        { status: 403 }
      );
    }

    // ✅ Create the ticket
    const { error: insertError } = await supabase.from("tickets").insert([
      {
        event_id,
        buyer_name,
        buyer_email,
        amount_paid: amount || 0,
        payment_ref: reference,
        category: category || "Free",
        coupon_code: coupon_code || null, // ✅ store coupon if used
      },
    ]);

    if (insertError) throw insertError;

    // ✅ Increment coupon usage count if a coupon was applied
    if (coupon_code) {
      const { error: rpcError } = await supabase.rpc("increment_coupon_usage", {
        coupon_code_param: coupon_code,
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
