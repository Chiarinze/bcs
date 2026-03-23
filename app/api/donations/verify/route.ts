import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = rateLimit(getClientIp(req.headers), {
    key: "donation-verify",
    limit: 10,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const { reference, donor_name, donor_email, amount, message } =
    await req.json();

  if (!reference || !amount) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
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

    if (verifyData.status !== true || verifyData.data.status !== "success") {
      return NextResponse.json(
        { error: "Payment verification failed or not completed" },
        { status: 400 }
      );
    }

    // Verify the amount matches (Paystack returns in kobo)
    const paidAmountKobo = verifyData.data.amount;
    if (paidAmountKobo !== amount * 100) {
      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { error: insertError } = await supabase.from("donations").insert({
      donor_name: donor_name || "Anonymous",
      donor_email: donor_email || "anonymous@beninchoraleandphilharmonic.com",
      amount,
      message: message || null,
      payment_reference: reference,
    });

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: "Donation recorded successfully. Thank you!",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Donation verification error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
