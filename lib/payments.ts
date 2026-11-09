import type { ServerSupabase } from "@/lib/supabaseServer";
import { verifyTransaction, type PaidTransaction } from "@/lib/paystack";

export type PaymentStatus = "pending" | "fulfilled" | "needs_review" | "failed" | "refunded" | "dismissed";

export interface PaymentRow {
  reference: string;
  kind: "ticket" | "internal" | "donation" | "unknown";
  status: PaymentStatus;
  gateway_status: string | null;
  event_id: string | null;
  checked_at: string | null;
  created_at: string;
}

export const PAYMENT_COLUMNS = "reference, kind, status, gateway_status, event_id, checked_at, created_at";

/** Records a paid transaction. Safe to repeat; throws only if the database call fails. */
export async function fulfilPayment(
  supabase: ServerSupabase,
  reference: string,
  paid: PaidTransaction,
  force = false
): Promise<PaymentStatus> {
  const { data, error } = await supabase.rpc("fulfill_payment", {
    p_reference: reference,
    p_paid_kobo: paid.amountKobo,
    p_currency: paid.currency,
    p_paid_at: paid.paidAt,
    p_paystack_id: paid.paystackId,
    p_email: paid.email,
    p_force: force,
  });
  if (error) throw new Error(`fulfill_payment failed: ${error.message}`);
  return data as PaymentStatus;
}

/**
 * Asks Paystack about a payment and brings our record up to date. `force`
 * skips the amount check when an admin completes a payment by hand; Paystack
 * must still report it as paid.
 */
export async function settlePayment(
  supabase: ServerSupabase,
  payment: PaymentRow,
  force = false
): Promise<PaymentRow> {
  const result = await verifyTransaction(payment.reference);
  if (result.state === "unavailable") return payment;

  const checked_at = new Date().toISOString();

  if (result.state === "success") {
    const status = await fulfilPayment(supabase, payment.reference, result.paid, force);
    await supabase.from("payments").update({ checked_at }).eq("reference", payment.reference);
    return { ...payment, status, gateway_status: "success", checked_at };
  }

  const update: { gateway_status: string; checked_at: string; status?: PaymentStatus } = {
    gateway_status: result.gateway,
    checked_at,
  };
  if (result.state === "failed" && payment.status === "pending") update.status = "failed";

  // The status filter stops a stale read overwriting a concurrent fulfilment.
  await supabase.from("payments").update(update).eq("reference", payment.reference).eq("status", payment.status);
  return { ...payment, ...update };
}

/**
 * Before starting a new checkout, settles this customer's recent unfinished
 * attempts. Returns one to send them to rather than charging them again: a
 * payment that turns out to be complete, or one that is still in progress.
 */
export async function findUnfinishedPayment(
  supabase: ServerSupabase,
  match: { event_id: string; user_id?: string; email?: string; category?: string }
): Promise<PaymentRow | null> {
  let query = supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("status", "pending")
    .eq("event_id", match.event_id)
    .gte("created_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(3);

  // Callers identified only by a typed email must never be shown what this
  // returns: a reference is checked at the door, so it is the buyer's alone.
  if (match.user_id) query = query.eq("user_id", match.user_id);
  if (match.email) query = query.eq("email", match.email);
  if (match.category) query = query.eq("details->row->>category", match.category);

  const { data } = await query;

  for (const row of (data ?? []) as PaymentRow[]) {
    const settled = await settlePayment(supabase, row);
    if (settled.status === "fulfilled" || settled.status === "needs_review") return settled;

    // A transfer in progress; after 30 minutes assume it was given up on.
    const recent = Date.now() - new Date(row.created_at).getTime() < 30 * 60 * 1000;
    if (settled.status === "pending" && settled.gateway_status === "ongoing" && recent) return settled;
  }
  return null;
}

/** Where the customer goes once a payment is complete, and to try again. */
export function paymentLinks(
  payment: { kind: PaymentRow["kind"]; reference: string },
  slug: string | null
): { success: string | null; retry: string | null } {
  if (payment.kind === "donation") {
    return { success: `/donate/success?ref=${encodeURIComponent(payment.reference)}`, retry: "/donate" };
  }
  if (!slug) return { success: null, retry: null };
  if (payment.kind === "internal") {
    return { success: `/dashboard/events/${slug}`, retry: `/dashboard/events/${slug}` };
  }
  if (payment.kind === "ticket") {
    return {
      success: `/events/${slug}/success?ref=${encodeURIComponent(payment.reference)}`,
      retry: `/events/${slug}/purchase`,
    };
  }
  return { success: null, retry: null };
}
