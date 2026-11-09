import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { PAYMENT_COLUMNS, paymentLinks, settlePayment, type PaymentRow } from "@/lib/payments";

const REFERENCE_RE = /^[A-Za-z0-9._=-]{1,100}$/;
const RECHECK_AFTER_MS = 4000;

/**
 * What the customer's browser polls after returning from Paystack. Knowing
 * the (random) reference is what authorises this, so it returns no personal
 * details. A rate-limited client just polls again: nothing is lost.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(getClientIp(req.headers), {
    key: "payment-status",
    limit: 120,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const reference = req.nextUrl.searchParams.get("reference") ?? "";
  if (!REFERENCE_RE.test(reference)) {
    return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .eq("reference", reference)
      .maybeSingle();

    if (!data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    let payment = data as PaymentRow;
    const checkedAgo = payment.checked_at ? Date.now() - new Date(payment.checked_at).getTime() : Infinity;
    if (payment.status === "pending" && checkedAgo > RECHECK_AFTER_MS) {
      payment = await settlePayment(supabase, payment);
    }

    let slug: string | null = null;
    if (payment.event_id) {
      const { data: event } = await supabase.from("events").select("slug").eq("id", payment.event_id).maybeSingle();
      slug = event?.slug ?? null;
    }

    const links = paymentLinks(payment, slug);
    return NextResponse.json({
      status: payment.status === "dismissed" ? "needs_review" : payment.status,
      gateway: payment.gateway_status,
      success_url: payment.status === "fulfilled" ? links.success : null,
      retry_url: links.retry,
    });
  } catch (error) {
    console.error("Payment status error:", (error as Error).message);
    return NextResponse.json({ error: "Could not check this payment" }, { status: 500 });
  }
}
