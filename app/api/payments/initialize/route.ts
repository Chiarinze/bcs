import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, type ServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";
import { paperFields } from "@/lib/paperFields";
import { initializeTransaction } from "@/lib/paystack";
import { findUnfinishedPayment, paymentLinks } from "@/lib/payments";
import {
  TICKET_EVENT_COLUMNS,
  applyCoupon,
  memberRegistrationRow,
  quoteTicket,
  type TicketEvent,
} from "@/lib/checkout";
import { isEventOver, isValidEmail, normalizeEmail } from "@/lib/pricing";

const MAX_DONATION = 10_000_000;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** The Origin header has already been matched to our own hosts by the CSRF middleware. */
function siteOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL;
  try {
    return origin ? new URL(origin).origin : null;
  } catch {
    return null;
  }
}

/** Saves the order, then opens a Paystack checkout for exactly that amount. */
async function startCheckout(
  req: NextRequest,
  supabase: ServerSupabase,
  order: {
    prefix: string;
    kind: "ticket" | "internal" | "donation";
    amountNaira: number;
    email: string;
    name: string;
    eventId?: string;
    userId?: string;
    details: Record<string, unknown>;
  }
) {
  const origin = siteOrigin(req);
  if (!origin) {
    console.error("Checkout: no Origin header and NEXT_PUBLIC_BASE_URL is not set");
    return fail("Payment could not be started. Please try again.", 500);
  }

  const reference = `${order.prefix}-${randomUUID()}`;
  const amountKobo = order.amountNaira * 100;

  const { error } = await supabase.from("payments").insert({
    reference,
    kind: order.kind,
    amount_kobo: amountKobo,
    event_id: order.eventId ?? null,
    user_id: order.userId ?? null,
    email: order.email,
    name: order.name,
    details: order.details,
  });

  if (error) {
    console.error("Could not save payment:", error.message);
    return fail("Payment could not be started. Please try again.", 500);
  }

  const statusUrl = `${origin}/payment/status?reference=${encodeURIComponent(reference)}`;
  const checkout = await initializeTransaction({
    reference,
    email: order.email,
    amountKobo,
    callbackUrl: statusUrl,
    cancelUrl: `${statusUrl}&cancelled=1`,
    metadata: { kind: order.kind, event_id: order.eventId ?? null },
  });

  if (!checkout) {
    await supabase.from("payments").update({ status: "failed" }).eq("reference", reference);
    return fail("We could not reach the payment provider. You have not been charged. Please try again.", 502);
  }

  return NextResponse.json({ reference, authorization_url: checkout.authorizationUrl });
}

function priceChanged(amount: number) {
  return NextResponse.json(
    { error: `The price has changed to ₦${amount.toLocaleString()}. Please review it before paying.`, amount },
    { status: 409 }
  );
}

async function ticketCheckout(req: NextRequest, supabase: ServerSupabase, body: Record<string, unknown>) {
  const buyerName = text(body.buyer_name, 120);
  const buyerEmail = normalizeEmail(body.buyer_email);
  if (!buyerName) return fail("Please enter your name");
  if (!isValidEmail(buyerEmail)) return fail("Please enter a valid email address");

  const { data } = await supabase
    .from("events")
    .select(TICKET_EVENT_COLUMNS)
    .eq("id", text(body.event_id, 64))
    .maybeSingle();

  const event = data as (TicketEvent & { title: string }) | null;
  if (!event) return fail("Event not found", 404);
  if (event.is_internal) return fail("This event is for members. Please register from your dashboard.");
  if (event.registration_closed || isEventOver(event)) return fail("Registration for this event has closed.", 403);

  const paper = paperFields(event.collect_paper_info === true, body);
  if ("error" in paper) return fail(paper.error);

  const quote = await quoteTicket(supabase, event, body.category, body.coupon_code);
  if ("error" in quote) return fail(quote.error);

  if (quote.price <= 0) return NextResponse.json({ free: true });
  if (Number(body.expected_amount) !== quote.price) return priceChanged(quote.price);

  // No reference in this reply: the caller has only typed an email address.
  const unfinished = await findUnfinishedPayment(supabase, {
    event_id: event.id,
    email: buyerEmail,
    category: quote.category,
  });
  if (unfinished) {
    return fail(
      unfinished.status === "pending"
        ? "A payment for this ticket is still being processed. Please wait a few minutes and check your email before paying again."
        : "We have already received a payment for this ticket with this email address. Please check your inbox.",
      409
    );
  }

  return startCheckout(req, supabase, {
    prefix: "BCS",
    kind: "ticket",
    amountNaira: quote.price,
    email: buyerEmail,
    name: buyerName,
    eventId: event.id,
    details: {
      coupon_code: quote.code,
      subscribe: body.subscribe === true,
      row: { buyer_name: buyerName, buyer_email: buyerEmail, category: quote.category, ...paper },
    },
  });
}

async function internalCheckout(req: NextRequest, supabase: ServerSupabase, body: Record<string, unknown>) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { data: event } = await supabase
    .from("events")
    .select("id, slug, is_internal, is_paid, price, registration_closed, date, end_date")
    .eq("id", text(body.event_id, 64))
    .maybeSingle();

  if (!event) return fail("Event not found", 404);
  if (!event.is_internal) return fail("This is not an internal event");
  if (event.registration_closed || isEventOver(event)) return fail("Registration is closed for this event.", 403);

  // Everything that could block the registration is checked before charging.
  const { data: existing } = await supabase
    .from("internal_event_registrations")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", auth.id)
    .maybeSingle();
  if (existing) return fail("You are already registered for this event", 409);

  const member = await memberRegistrationRow(supabase, auth.id);
  if ("error" in member) return fail(member.error, member.status);

  const email = normalizeEmail(member.email || auth.email || "");
  if (!isValidEmail(email)) return fail("Your profile needs a valid email address before you can pay.");

  const basePrice = event.is_paid ? Number(event.price) || 0 : 0;
  const quote = await applyCoupon(supabase, event.id, body.coupon_code, basePrice);
  if (quote.error) return fail(quote.error);

  if (quote.price <= 0) return NextResponse.json({ free: true });
  if (Number(body.expected_amount) !== quote.price) return priceChanged(quote.price);

  const unfinished = await findUnfinishedPayment(supabase, { event_id: event.id, user_id: auth.id });
  if (unfinished) {
    return NextResponse.json({
      reference: unfinished.reference,
      status_url: `/payment/status?reference=${encodeURIComponent(unfinished.reference)}`,
      ...paymentLinks(unfinished, event.slug),
    });
  }

  return startCheckout(req, supabase, {
    prefix: "BCS-INT",
    kind: "internal",
    amountNaira: quote.price,
    email,
    name: member.name,
    eventId: event.id,
    userId: auth.id,
    details: { coupon_code: quote.code, row: member.row },
  });
}

async function donationCheckout(req: NextRequest, supabase: ServerSupabase, body: Record<string, unknown>) {
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < 100 || amount > MAX_DONATION) {
    return fail(`Please enter a whole amount between ₦100 and ₦${MAX_DONATION.toLocaleString()}.`);
  }

  const typedEmail = normalizeEmail(body.donor_email);
  if (typedEmail && !isValidEmail(typedEmail)) return fail("Please enter a valid email address");

  const donorEmail = typedEmail || "anonymous@beninchoraleandphilharmonic.com";
  const donorName = text(body.donor_name, 120) || "Anonymous";

  return startCheckout(req, supabase, {
    prefix: "DON",
    kind: "donation",
    amountNaira: amount,
    email: donorEmail,
    name: donorName,
    details: {
      row: { donor_name: donorName, donor_email: donorEmail, message: text(body.message, 1000) || null },
    },
  });
}

/**
 * Step one of every payment. All validation and pricing happens here, while
 * no money has moved. After this the order is fixed: what the customer pays
 * for cannot be changed by the browser or by later admin edits.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request");

  try {
    const supabase = createServerSupabase();
    if (body.kind === "ticket") return await ticketCheckout(req, supabase, body);
    if (body.kind === "internal") return await internalCheckout(req, supabase, body);
    if (body.kind === "donation") return await donationCheckout(req, supabase, body);
    return fail("Invalid request");
  } catch (error) {
    console.error("Checkout error:", (error as Error).message);
    return fail("Payment could not be started. Please try again.", 500);
  }
}
