"use client";

import { useState, useEffect } from "react";
import { TextInput, TextArea } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import { Heart } from "lucide-react";

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export default function DonatePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load Paystack script
  useEffect(() => {
    if (typeof window === "undefined" || window.paystackLoaded) return;
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => {
      window.paystackLoaded = true;
    };
    document.body.appendChild(script);
  }, []);

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!amount || amount < 100) {
      setError("Please enter a donation amount of at least ₦100.");
      return;
    }

    setLoading(true);

    // Wait for Paystack to load
    for (let i = 0; i < 20; i++) {
      if (window.PaystackPop && typeof window.PaystackPop.setup === "function")
        break;
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!window.PaystackPop) {
      setError("Payment provider failed to load. Please reload the page.");
      setLoading(false);
      return;
    }

    const reference = `DON-${Date.now()}`;
    const donorEmail = email.trim() || "anonymous@beninchoraleandphilharmonic.com";
    const donorName = name.trim() || "Anonymous";

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: donorEmail,
      amount: amount * 100, // Paystack expects kobo
      currency: "NGN",
      ref: reference,
      metadata: {
        donor_name: donorName,
        message: message || undefined,
        type: "donation",
      },
      callback: function (response: { reference: string }) {
        // Verify payment on server
        fetch("/api/donations/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: response.reference,
            donor_name: donorName,
            donor_email: donorEmail,
            amount,
            message: message || null,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              window.location.href = `/donate/success?ref=${response.reference}&name=${encodeURIComponent(donorName)}`;
            } else {
              setError(
                data.error || "Payment verified but record failed. Please contact support."
              );
            }
          })
          .catch(() => {
            setError("Payment completed, but verification failed. Please contact support.");
          });
      },
      onClose: function () {
        setLoading(false);
      },
    });

    handler.openIframe();
  }

  return (
    <section className="py-20 bg-[#F9F9F7] min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow mx-auto mb-4">
            <Image
              src={IMAGES.logo}
              alt="BCS logo"
              width={64}
              height={64}
              priority
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-bcs-green mb-3">
            Support Our Music
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Your generous donation helps the Benin Chorale & Philharmonic
            continue bringing harmony, passion, and artistry to audiences across
            Nigeria and beyond.
          </p>
        </div>

        {/* Donation Form */}
        <form
          onSubmit={handleDonate}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 space-y-6"
        >
          {/* Preset Amounts */}
          <div>
            <label className="text-sm font-medium text-bcs-green block mb-3">
              Select an amount
            </label>
            <div className="flex flex-wrap gap-3">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium border transition ${
                    amount === preset
                      ? "bg-bcs-green text-white border-bcs-green"
                      : "bg-white text-gray-700 border-gray-200 hover:border-bcs-green hover:text-bcs-green"
                  }`}
                >
                  ₦{preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="text-sm font-medium text-bcs-green block mb-1">
              Or enter a custom amount (₦)
            </label>
            <input
              type="number"
              min={100}
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="e.g. 15000"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent outline-none"
            />
          </div>

          {/* Optional Name */}
          <TextInput
            label="Your Name (optional)"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leave blank to donate anonymously"
          />

          {/* Optional Email */}
          <TextInput
            type="email"
            label="Email Address (optional)"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="For your donation receipt"
          />

          {/* Optional Message */}
          <TextArea
            label="Message (optional)"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message of support..."
            rows={3}
          />

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-bcs-green hover:bg-bcs-accent text-lg py-3 flex items-center justify-center gap-2"
          >
            <Heart className="w-5 h-5" />
            {loading
              ? "Processing..."
              : amount
                ? `Donate ₦${Number(amount).toLocaleString()}`
                : "Donate"}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Payments are securely processed by Paystack. Your card details are
            never stored on our servers.
          </p>
        </form>
      </div>
    </section>
  );
}
