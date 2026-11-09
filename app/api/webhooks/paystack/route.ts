import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { isValidPaystackSignature, toPaidTransaction } from "@/lib/paystack";
import { fulfilPayment } from "@/lib/payments";

/**
 * Paystack tells us directly when money moves, so a payment no longer depends
 * on the customer's browser. Anything other than a 200 makes Paystack retry,
 * which is what we want if the database is unavailable.
 */
export async function POST(req: NextRequest) {
  // The signature covers the exact bytes sent, so read them before parsing.
  const rawBody = await req.text();
  if (!isValidPaystackSignature(rawBody, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = payload.data ?? {};

  try {
    const supabase = createServerSupabase();

    if (payload.event === "charge.success") {
      if (data.status === "success" && typeof data.reference === "string") {
        await fulfilPayment(supabase, data.reference, toPaidTransaction(data));
      }
    } else if (payload.event === "refund.processed") {
      const transaction = data.transaction as { id?: number; reference?: string } | number | string | undefined;
      const paystackId = typeof transaction === "object" ? transaction?.id : Number(transaction) || null;

      let reference =
        (data.transaction_reference as string | undefined) ??
        (typeof transaction === "object" ? transaction?.reference : undefined);

      if (!reference && paystackId) {
        const { data: match } = await supabase
          .from("payments")
          .select("reference")
          .eq("paystack_id", paystackId)
          .maybeSingle();
        reference = match?.reference;
      }

      const amount = Number(data.amount);
      const { error } = await supabase.rpc("refund_payment", {
        // Unmatched refunds still surface in the admin review list.
        p_reference: reference ?? `refund-${data.id ?? paystackId ?? Date.now()}`,
        p_refund_kobo: Number.isFinite(amount) && amount > 0 ? amount : null,
      });
      if (error) throw new Error(`refund_payment failed: ${error.message}`);
    } else if (payload.event === "charge.dispute.create") {
      const transaction = data.transaction as { reference?: string } | undefined;
      if (transaction?.reference) {
        const reason = "Chargeback opened by the customer's bank";
        await supabase
          .from("payments")
          .update({ status: "needs_review", review_reason: reason })
          .eq("reference", transaction.reference)
          .eq("status", "fulfilled");
        await supabase.rpc("alert_payment_review", { p_reference: transaction.reference, p_reason: reason });
      }
    }
  } catch (error) {
    console.error("Paystack webhook error:", (error as Error).message);
    return NextResponse.json({ error: "Could not process event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
