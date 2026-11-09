import type { ServerSupabase } from "@/lib/supabaseServer";
import { discountedPrice, normalizeCouponCode } from "@/lib/pricing";

export interface CouponQuote {
  price: number;
  code: string | null;
  discountPercent: number;
  error?: string;
}

/**
 * Looks up a coupon for an event and applies it to a base price. Every check
 * happens here, before payment: once a customer has paid, nothing about the
 * coupon can undo it.
 */
export async function applyCoupon(
  supabase: ServerSupabase,
  eventId: string,
  rawCode: unknown,
  basePrice: number
): Promise<CouponQuote> {
  const none = { price: basePrice, code: null, discountPercent: 0 };
  const code = normalizeCouponCode(rawCode);
  if (!code || basePrice <= 0) return none;

  // ilike: older codes were saved in whatever case the admin typed them.
  const { data: coupon, error } = await supabase
    .from("coupon_codes")
    .select("code, discount_percent, is_active, usage_limit, usage_count")
    .eq("event_id", eventId)
    .ilike("code", code.replace(/[\\%_]/g, "\\$&"))
    .maybeSingle();

  if (error) {
    console.error("Coupon lookup failed:", error.message);
    return { ...none, error: "Could not verify the coupon. Please try again." };
  }
  if (!coupon) return { ...none, error: "Invalid coupon code" };
  if (!coupon.is_active) return { ...none, error: "This coupon is no longer active" };
  if (typeof coupon.usage_limit === "number" && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
    return { ...none, error: "Coupon usage limit has been reached" };
  }

  const discountPercent = Number(coupon.discount_percent) || 0;
  if (discountPercent < 0 || discountPercent > 100) return { ...none, error: "Invalid coupon discount" };

  return { price: discountedPrice(basePrice, discountPercent), code: coupon.code, discountPercent };
}

export interface TicketEvent {
  id: string;
  is_paid: boolean | null;
  is_internal: boolean | null;
  registration_closed: boolean | null;
  collect_paper_info: boolean | null;
  date: string;
  end_date: string | null;
}

export const TICKET_EVENT_COLUMNS =
  "id, title, slug, is_paid, is_internal, registration_closed, collect_paper_info, date, end_date";

/** Prices a public ticket. A paid event always needs a real category. */
export async function quoteTicket(
  supabase: ServerSupabase,
  event: TicketEvent,
  category: unknown,
  couponCode: unknown
): Promise<(Omit<CouponQuote, "error"> & { category: string }) | { error: string }> {
  if (!event.is_paid) {
    return { price: 0, code: null, discountPercent: 0, category: "Free" };
  }

  if (typeof category !== "string" || !category) {
    return { error: "Please choose a ticket category" };
  }

  const { data: ticketCategory } = await supabase
    .from("ticket_categories")
    .select("name, price")
    .eq("event_id", event.id)
    .eq("name", category)
    .maybeSingle();

  if (!ticketCategory) return { error: "Invalid ticket category for this event" };

  const quote = await applyCoupon(supabase, event.id, couponCode, Number(ticketCategory.price) || 0);
  if (quote.error) return { error: quote.error };
  return { price: quote.price, code: quote.code, discountPercent: quote.discountPercent, category: ticketCategory.name };
}

/** Columns for a member's registration, taken from their profile. */
export async function memberRegistrationRow(
  supabase: ServerSupabase,
  userId: string
): Promise<{ row: Record<string, unknown>; email: string; name: string } | { error: string; status: number }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, other_name, email, physical_address, ensemble_arm, choir_part, orchestra_instrument, year_inducted, membership_status, photo_url, membership_id")
    .eq("id", userId)
    .single();

  if (!profile) return { error: "Profile not found", status: 404 };
  if (!profile.first_name || !profile.last_name) {
    return { error: "Please complete your profile first", status: 400 };
  }

  return {
    email: profile.email,
    name: `${profile.first_name} ${profile.last_name}`,
    row: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      other_name: profile.other_name || null,
      email: profile.email,
      physical_address: profile.physical_address || "",
      ensemble_arm: profile.ensemble_arm || "",
      choir_part: profile.choir_part || null,
      orchestra_instrument: profile.orchestra_instrument || null,
      join_year: profile.year_inducted || new Date().getFullYear(),
      membership_status: profile.membership_status || "probationary",
      passport_url: profile.photo_url || "",
      membership_id: profile.membership_id || null,
    },
  };
}
