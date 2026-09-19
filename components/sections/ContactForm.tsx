"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { TextInput, TextArea } from "@/components/ui/FormInputs";
import HCaptchaWidget from "@/components/HCaptchaWidget";

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [token, setToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Please complete the captcha.");
      return;
    }

    setLoading(true);
    const honeypot = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value || "";

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, website: honeypot, hcaptcha_token: token }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      setToken(null);
      setCaptchaKey((k) => k + 1);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <CheckCircle className="w-12 h-12 text-bcs-green mx-auto mb-4" />
        <h3 className="font-serif text-2xl text-bcs-green mb-2">Message sent</h3>
        <p className="text-gray-600 mb-6">
          Thank you, {form.name.split(" ")[0]}. We’ve received your message and will reply to{" "}
          <span className="font-medium">{form.email}</span> as soon as we can.
        </p>
        <Button
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          onClick={() => {
            setForm({ name: "", email: "", phone: "", subject: "", message: "" });
            setToken(null);
            setCaptchaKey((k) => k + 1);
            setSent(false);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 text-left space-y-5"
    >
      <div className="grid md:grid-cols-2 gap-5">
        <TextInput label="Your name" name="name" required value={form.name} onChange={set("name")} autoComplete="name" />
        <TextInput label="Email" name="email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <TextInput label="Phone (optional)" name="phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
        <TextInput label="Subject" name="subject" required value={form.subject} onChange={set("subject")} />
      </div>
      <TextArea label="Message" name="message" required rows={6} value={form.message} onChange={set("message")} />

      {/* Honeypot — hidden from humans, filled by naive bots. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {SITE_KEY ? (
        <HCaptchaWidget
          siteKey={SITE_KEY}
          resetKey={captchaKey}
          onVerify={setToken}
          onExpire={() => setToken(null)}
        />
      ) : (
        <p className="text-sm text-red-600">Captcha is not configured.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" loading={loading} className="px-8 py-3">
        <Send className="w-4 h-4" /> Send message
      </Button>
    </form>
  );
}
