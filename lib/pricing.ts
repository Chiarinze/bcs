/**
 * Pricing and form rules shared by the browser and the server, so what a
 * customer sees is exactly what they are charged. Keep this free of
 * server-only imports.
 */

/** Discounted price in whole naira. Paystack is always charged this amount. */
export function discountedPrice(basePrice: number, discountPercent: number): number {
  return Math.round((basePrice * (100 - discountPercent)) / 100);
}

export function normalizeCouponCode(code: unknown): string {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * True once the event's last day has fully passed in Lagos. Compares
 * calendar days, so the event stays open for its whole final day whether
 * the column holds a date or a timestamp.
 */
export function isEventOver(event: { date: string; end_date?: string | null }): boolean {
  const lastDay = (event.end_date || event.date).slice(0, 10);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  return today > lastDay;
}
