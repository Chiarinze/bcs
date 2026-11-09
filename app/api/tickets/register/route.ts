import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { paperFields } from "@/lib/paperFields";
import { TICKET_EVENT_COLUMNS, quoteTicket, type TicketEvent } from "@/lib/checkout";
import { isEventOver, isValidEmail, normalizeEmail } from "@/lib/pricing";

/** Free tickets only: free events, and paid tickets fully covered by a coupon. */
export async function POST(req: NextRequest) {
  const limited = rateLimit(getClientIp(req.headers), {
    key: "ticket-register",
    limit: 10,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { event_id, category, coupon_code, subscribe } = body;

    const buyerName = typeof body.buyer_name === "string" ? body.buyer_name.trim().slice(0, 120) : "";
    const buyerEmail = normalizeEmail(body.buyer_email);

    if (!event_id || !buyerName || !buyerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isValidEmail(buyerEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data } = await supabase.from("events").select(TICKET_EVENT_COLUMNS).eq("id", event_id).maybeSingle();
    const event = data as TicketEvent | null;

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.is_internal) {
      return NextResponse.json({ error: "This event is for members." }, { status: 400 });
    }
    if (event.registration_closed || isEventOver(event)) {
      return NextResponse.json({ error: "Registration is closed for this event." }, { status: 403 });
    }

    // Paper presentation details are required when the event collects them.
    const paper = paperFields(event.collect_paper_info === true, body);
    if ("error" in paper) {
      return NextResponse.json({ error: paper.error }, { status: 400 });
    }

    const quote = await quoteTicket(supabase, event, category, coupon_code);
    if ("error" in quote) {
      return NextResponse.json({ error: quote.error }, { status: 400 });
    }

    // Free path only applies when the resolved price is zero.
    if (quote.price > 0) {
      return NextResponse.json(
        { error: "This ticket requires payment. Please use the paid checkout flow." },
        { status: 400 }
      );
    }

    if (quote.code) {
      const { data: redeemed, error: redeemError } = await supabase.rpc("redeem_coupon", {
        p_event_id: event.id,
        p_code: quote.code,
      });
      if (redeemError) throw redeemError;
      if (!redeemed) {
        return NextResponse.json({ error: "Coupon usage limit has been reached" }, { status: 400 });
      }
    }

    // Generated here, never taken from the request: a caller must not be able
    // to occupy a reference belonging to someone else's payment.
    const reference = `${quote.code ? "FREECOUPON" : "FREE"}-${randomUUID()}`;

    const { error: insertError } = await supabase.from("tickets").insert([
      {
        event_id: event.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        amount_paid: 0,
        payment_ref: reference,
        category: quote.category,
        coupon_code: quote.code,
        ...paper,
      },
    ]);

    if (insertError) {
      if (quote.code) await supabase.rpc("release_coupon", { p_event_id: event.id, p_code: quote.code });
      throw insertError;
    }

    // Opt-in to the mailing list (checkbox on the purchase form).
    if (subscribe === true) {
      const { error: subError } = await supabase.rpc("upsert_subscriber", {
        p_email: buyerEmail,
        p_name: buyerName,
        p_source: "ticket",
      });
      if (subError) console.error("Failed to add subscriber:", subError.message);
    }

    return NextResponse.json({ success: true, reference });
  } catch (error) {
    console.error("Free registration error:", (error as Error).message);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
