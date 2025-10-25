"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Event, TicketCategory } from "@/types";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PaystackPop?: any;
    paystackLoaded?: boolean;
  }
}

interface Props {
  event: Event;
  categories: TicketCategory[];
}

export default function PurchaseForm({ event, categories }: Props) {
  const searchParams = useSearchParams();

  const preselectedCategory = searchParams.get("category");
  const preselectedPrice = searchParams.get("price");

  const [selectedCategory, setSelectedCategory] = useState<string>(
    preselectedCategory || ""
  );
  const [amount, setAmount] = useState<number>(
    preselectedPrice ? Number(preselectedPrice) : 0
  );
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [coupon, setCoupon] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [discountedAmount, setDiscountedAmount] = useState<number | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // ✅ Load Paystack script only once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.paystackLoaded) return;

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => {
      window.paystackLoaded = true;
    };
    document.body.appendChild(script);
  }, []);

  // 🔄 Update amount if category changes
  useEffect(() => {
    if (selectedCategory && !preselectedPrice) {
      const found = categories.find((c) => c.name === selectedCategory);
      setAmount(found ? found.price : 0);
    }
  }, [selectedCategory, categories, preselectedPrice]);

  async function applyCoupon() {
    if (!coupon) return alert("Please enter a coupon code.");
    setCheckingCoupon(true);

    try {
      const res = await fetch(
        `/api/coupons/validate?event_id=${event.id}&code=${coupon}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Invalid coupon");

      setDiscountPercent(data.discount_percent);
      const newAmount = amount - (amount * data.discount_percent) / 100;
      setDiscountedAmount(newAmount);
      alert(`Coupon applied! ${data.discount_percent}% off`);
    } catch (err) {
      alert((err as Error).message);
      setDiscountPercent(null);
      setDiscountedAmount(null);
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (!buyerName || !buyerEmail) {
        alert("Please fill in all fields.");
        setLoading(false);
        return;
      }

      // 🟢 FREE EVENT: no payment needed
      if (!event.is_paid) {
        const reference = `FREE-${Date.now()}`;

        const res = await fetch("/api/tickets/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference,
            event_id: event.id,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            category: selectedCategory || "Free",
            amount: 0,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.location.href = `/events/${event.slug}/success?ref=${reference}`;
        } else {
          alert(data.error || "Registration failed. Please try again.");
        }

        setLoading(false);
        return;
      }

      // 🟠 PAID EVENT: check coupon value
      const finalAmount = discountedAmount ?? amount;

      if (finalAmount <= 0) {
        // ✅ 100% OFF COUPON — treat as free
        const reference = `FREECOUPON-${Date.now()}`;

        const res = await fetch("/api/tickets/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference,
            event_id: event.id,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            category: selectedCategory || "Free",
            amount: 0,
            coupon_code: coupon || null,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.location.href = `/events/${event.slug}/success?ref=${reference}`;
        } else {
          alert(data.error || "Free registration failed. Please try again.");
        }

        setLoading(false);
        return;
      }

      // 🧾 Otherwise, normal Paystack payment
      for (let i = 0; i < 20; i++) {
        if (
          window.PaystackPop &&
          typeof window.PaystackPop.setup === "function"
        )
          break;
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!window.PaystackPop) {
        alert("Paystack failed to load. Please reload the page.");
        setLoading(false);
        return;
      }

      const reference = `BCS-${Date.now()}`;
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: buyerEmail,
        amount: finalAmount * 100,
        currency: "NGN",
        ref: reference,
        metadata: {
          name: buyerName,
          category: selectedCategory,
          event_title: event.title,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: function (response: any) {
          fetch("/api/tickets/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: response.reference,
              event_id: event.id,
              buyer_name: buyerName,
              buyer_email: buyerEmail,
              category: selectedCategory,
              amount: finalAmount,
              coupon_code: coupon || null,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                window.location.href = `/events/${event.slug}/success?ref=${response.reference}`;
              } else {
                alert(
                  data.error ||
                    "Payment verified but ticket not recorded. Please contact support."
                );
              }
            })
            .catch((err) => {
              console.error("Verification error:", err);
              alert("Payment completed, but verification failed.");
            });
        },
        onClose: function () {
          alert("Payment window closed or cancelled.");
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment could not start. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 border-t border-gray-100 pt-6"
    >
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
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
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

          {discountPercent && (
            <p className="text-sm text-gray-600">
              {discountPercent}% discount applied — New total:{" "}
              <span className="font-semibold">
                ₦{discountedAmount?.toLocaleString()}
              </span>
            </p>
          )}
        </div>
      )}

      {(event.is_paid && (discountedAmount ?? 0) > 0) ||
        (amount > 0 && (
          <p className="text-gray-700 font-medium">
            {`Total Amount: ₦${
              discountedAmount?.toLocaleString() || amount.toLocaleString()
            }`}
          </p>
        ))}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-bcs-green hover:bg-bcs-accent rounded-full py-3"
      >
        {loading
          ? "Processing..."
          : event.is_paid
          ? `Pay ₦${
              discountedAmount?.toLocaleString() || amount.toLocaleString()
            }`
          : "Register (Free)"}
      </Button>
    </form>
  );
}
