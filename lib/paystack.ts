import { createHmac, timingSafeEqual } from "crypto";

const API = "https://api.paystack.co";
const TIMEOUT_MS = 8000;

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY not set in environment");
  return key;
}

/** Calls Paystack. Returns null for a timeout, network error or non-JSON reply. */
async function paystackFetch(path: string, init?: RequestInit) {
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    return body ? { ok: res.ok, status: res.status, body } : null;
  } catch (error) {
    console.error("Paystack request failed:", (error as Error).message);
    return null;
  }
}

export async function initializeTransaction(params: {
  reference: string;
  email: string;
  amountKobo: number;
  callbackUrl: string;
  cancelUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorizationUrl: string } | null> {
  const result = await paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      reference: params.reference,
      email: params.email,
      amount: String(params.amountKobo),
      currency: "NGN",
      callback_url: params.callbackUrl,
      metadata: { ...params.metadata, cancel_action: params.cancelUrl },
    }),
  });

  const url = result?.body?.data?.authorization_url;
  if (!result?.ok || typeof url !== "string") {
    console.error("Paystack initialize failed:", result?.body?.message ?? "no response");
    return null;
  }
  return { authorizationUrl: url };
}

export interface PaidTransaction {
  amountKobo: number;
  currency: string;
  paidAt: string | null;
  paystackId: number | null;
  email: string | null;
}

export type TransactionState =
  | { state: "success"; paid: PaidTransaction }
  /** Not finished yet: the customer may still be paying, or a transfer may land. */
  | { state: "pending"; gateway: string }
  /** Finished without taking money. */
  | { state: "failed"; gateway: string }
  /** Paystack could not be reached. Says nothing about the payment. */
  | { state: "unavailable" };

/** Reads a transaction webhook/verify `data` object. */
export function toPaidTransaction(data: {
  amount?: unknown;
  currency?: unknown;
  paid_at?: unknown;
  paidAt?: unknown;
  id?: unknown;
  customer?: { email?: unknown } | null;
}): PaidTransaction {
  const paidAt = data.paid_at ?? data.paidAt;
  return {
    amountKobo: Number(data.amount),
    currency: typeof data.currency === "string" ? data.currency : "",
    paidAt: typeof paidAt === "string" ? paidAt : null,
    paystackId: typeof data.id === "number" ? data.id : null,
    email: typeof data.customer?.email === "string" ? data.customer.email : null,
  };
}

export async function verifyTransaction(reference: string): Promise<TransactionState> {
  const result = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!result || result.status >= 500 || result.status === 429) return { state: "unavailable" };

  // Unknown to Paystack yet: the customer has not reached checkout.
  if (result.body.status !== true || !result.body.data) return { state: "pending", gateway: "not_found" };

  const gateway = String(result.body.data.status);
  if (gateway === "success") return { state: "success", paid: toPaidTransaction(result.body.data) };
  if (gateway === "failed" || gateway === "reversed") return { state: "failed", gateway };
  return { state: "pending", gateway };
}

/** Checks x-paystack-signature against the exact bytes Paystack sent. */
export function isValidPaystackSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
