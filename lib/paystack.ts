/**
 * Server-side Paystack verification. Confirms the transaction succeeded and
 * that the amount charged equals what we expected (in naira).
 */
export async function verifyPaystackPayment(
  reference: string,
  expectedNaira: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return { ok: false, error: "PAYSTACK_SECRET_KEY not set in environment" };

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } }
  );
  const data = await res.json().catch(() => null);

  if (!data || data.status !== true || data.data?.status !== "success") {
    return { ok: false, error: "Payment verification failed or not completed" };
  }

  const paidKobo = Number(data.data.amount);
  if (!Number.isFinite(paidKobo) || paidKobo !== Math.round(expectedNaira * 100)) {
    return { ok: false, error: "Payment amount does not match the expected price" };
  }

  return { ok: true };
}

/**
 * Applies a coupon for an event to a base price. Returns the discounted price
 * and the canonical code, or an error message when the coupon is not usable.
 */
export async function applyCoupon(
  supabase: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  eventId: string,
  code: string | null | undefined,
  basePrice: number
): Promise<{ price: number; code: string | null; error?: string }> {
  if (!code || basePrice <= 0) return { price: basePrice, code: null };

  const { data: coupon, error } = await supabase
    .from("coupon_codes")
    .select("*")
    .eq("event_id", eventId)
    .eq("code", code)
    .maybeSingle();

  if (error) return { price: basePrice, code: null, error: "Could not verify the coupon. Please try again." };
  if (!coupon || !coupon.is_active) return { price: basePrice, code: null, error: "Invalid or inactive coupon code" };
  if (typeof coupon.usage_limit === "number" && typeof coupon.usage_count === "number" && coupon.usage_count >= coupon.usage_limit) {
    return { price: basePrice, code: null, error: "Coupon usage limit has been reached" };
  }
  const discount = Number(coupon.discount_percent) || 0;
  if (discount < 0 || discount > 100) return { price: basePrice, code: null, error: "Invalid coupon discount" };

  return { price: Math.round(basePrice * (1 - discount / 100)), code: coupon.code };
}
