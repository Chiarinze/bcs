import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
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
