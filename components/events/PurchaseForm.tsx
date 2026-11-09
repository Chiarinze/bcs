"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import PendingPaymentNotice from "@/components/payments/PendingPaymentNotice";
import { useCheckout } from "@/hooks/useCheckout";
import { discountedPrice } from "@/lib/pricing";
import { Event, TicketCategory } from "@/types";

interface Props {
  event: Event;
  categories: TicketCategory[];
}

export default function PurchaseForm({ event, categories }: Props) {
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") || ""
  );
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [subscribe, setSubscribe] = useState(true);
  // Paper presentation details (only when the event collects them)
  const [affiliation, setAffiliation] = useState("");
  const [presenting, setPresenting] = useState<"" | "yes" | "no">("");
  const [paperTitle, setPaperTitle] = useState("");
  const collectPaper = !!event.collect_paper_info;
  const [registering, setRegistering] = useState(false);

  const [coupon, setCoupon] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const { startCheckout, starting } = useCheckout();
  const loading = registering || starting;

  // Always derived from the chosen category and the applied coupon, so the
  // figure on screen can't go stale. The server charges the same calculation.
  const basePrice = categories.find((c) => c.name === selectedCategory)?.price ?? 0;
  const finalAmount =
    discountPercent != null ? discountedPrice(basePrice, discountPercent) : basePrice;

  async function applyCoupon() {
    if (!coupon) return alert("Please enter a coupon code.");
    setCheckingCoupon(true);

    try {
      const res = await fetch(
        `/api/coupons/validate?event_id=${event.id}&code=${encodeURIComponent(coupon)}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Invalid coupon");

      setDiscountPercent(Number(data.discount_percent) || 0);
      alert(`Coupon applied! ${data.discount_percent}% off`);
    } catch (err) {
      alert((err as Error).message);
      setDiscountPercent(null);
    } finally {
      setCheckingCoupon(false);
    }
  }

  const paperFields = collectPaper
    ? {
        affiliation: affiliation.trim(),
        presenting_paper: presenting === "yes",
        paper_title: presenting === "yes" ? paperTitle.trim() : null,
      }
    : {};

  async function registerFree(order: Record<string, unknown>) {
    setRegistering(true);
    try {
      const res = await fetch("/api/tickets/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        window.location.href = `/events/${event.slug}/success?ref=${encodeURIComponent(data.reference)}`;
        return;
      }
      alert(data.error || "Registration failed. Please try again.");
    } catch {
      alert("We could not reach the server. Please check your connection and try again.");
    }
    setRegistering(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!buyerName || !buyerEmail) {
      alert("Please fill in all fields.");
      return;
    }
    if (collectPaper) {
      if (!affiliation.trim() || !presenting) {
        alert("Please tell us your institutional affiliation and whether you are presenting a paper.");
        return;
      }
      if (presenting === "yes" && !paperTitle.trim()) {
        alert("Please enter the title of your paper.");
        return;
      }
    }

    const order = {
      event_id: event.id,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      subscribe,
      ...paperFields,
      category: event.is_paid ? selectedCategory : undefined,
      coupon_code: discountPercent != null ? coupon : null,
    };

    if (!event.is_paid || (selectedCategory && finalAmount <= 0)) {
      await registerFree(order);
      return;
    }

    const result = await startCheckout({ ...order, kind: "ticket", expected_amount: finalAmount });
    if ("free" in result) await registerFree(order);
    else if ("error" in result) alert(result.error);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 border-t border-gray-100 pt-6"
    >
      <PendingPaymentNotice />

      <div>
        <label className="block text-sm font-medium text-bcs-green mb-1">
          Full Name
        </label>
        <input
          type="text"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-bcs-green"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-bcs-green mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-bcs-green"
        />
      </div>

      {collectPaper && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div>
            <label className="block text-sm font-medium text-bcs-green mb-1">
              Institutional Affiliation
            </label>
            <input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder="e.g. University of Benin"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-bcs-green"
            />
          </div>
          <div>
            <p className="block text-sm font-medium text-bcs-green mb-2">Are you presenting a paper?</p>
            <div className="flex gap-6">
              {(["yes", "no"] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="presenting"
                    value={v}
                    checked={presenting === v}
                    onChange={() => setPresenting(v)}
                    required
                    className="text-bcs-green focus:ring-bcs-green"
                  />
                  {v === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>
          {presenting === "yes" && (
            <div>
              <label className="block text-sm font-medium text-bcs-green mb-1">Title of your paper</label>
              <input
                type="text"
                value={paperTitle}
                onChange={(e) => setPaperTitle(e.target.value)}
                required
                maxLength={300}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-bcs-green"
              />
              <p className="text-xs text-gray-500 mt-1">
                We&apos;ll email you the abstract submission details after you register.
              </p>
            </div>
          )}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={subscribe}
          onChange={(e) => setSubscribe(e.target.checked)}
          className="mt-0.5 rounded border-gray-300 text-bcs-green focus:ring-bcs-green"
        />
        <span>
          Keep me updated about upcoming concerts and events by email. You can
          unsubscribe at any time.
        </span>
      </label>

      {event.is_paid && (
        <div>
          <label className="block text-sm font-medium text-bcs-green mb-1">
            Ticket Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-bcs-green"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name} — ₦{cat.price.toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {event.is_paid && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-bcs-green mb-1">
            Coupon Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value.toUpperCase());
                setDiscountPercent(null);
              }}
              placeholder="Enter coupon code"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-bcs-green"
            />
            <Button
              type="button"
              onClick={applyCoupon}
              disabled={checkingCoupon}
              className="bg-bcs-green hover:bg-bcs-accent"
            >
              {checkingCoupon ? "Checking..." : "Apply"}
            </Button>
          </div>

          {discountPercent != null && (
            <p className="text-sm text-gray-600">
              {discountPercent}% discount applied — New total:{" "}
              <span className="font-semibold">₦{finalAmount.toLocaleString()}</span>
            </p>
          )}
        </div>
      )}

      {event.is_paid && basePrice > 0 && (
        <p className="text-gray-700 font-medium">
          Total Amount: ₦{finalAmount.toLocaleString()}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-bcs-green hover:bg-bcs-accent rounded-full py-3"
      >
        {loading
          ? "Processing..."
          : event.is_paid
          ? `Pay ₦${finalAmount.toLocaleString()}`
          : "Register (Free)"}
      </Button>
    </form>
  );
}
