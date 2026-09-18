"use client";

import { useState } from "react";
import Link from "next/link";
import { MailX, MailCheck } from "lucide-react";
import Button from "@/components/ui/Button";

export default function UnsubscribeClient({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "done" | "resubscribed" | "error">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function call(method: "POST" | "PUT") {
    setLoading(true);
    setError("");
    const res = await fetch("/api/newsletter/unsubscribe", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setState("error");
    } else {
      setState(method === "POST" ? "done" : "resubscribed");
    }
    setLoading(false);
  }

  return (
    <section className="min-h-[60vh] flex items-center justify-center px-4 py-24 bg-[#F9F9F7]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
        {state === "idle" && (
          <>
            <MailX className="w-12 h-12 text-bcs-green mx-auto mb-4" />
            <h1 className="font-serif text-2xl text-bcs-green mb-2">Unsubscribe</h1>
            <p className="text-gray-600 mb-6">
              You’ll stop receiving newsletters and event announcements from The
              Benin Chorale &amp; Philharmonic. Confirmation emails for anything you
              register for will still be sent.
            </p>
            <Button onClick={() => call("POST")} loading={loading}>
              Yes, unsubscribe me
            </Button>
          </>
        )}

        {state === "done" && (
          <>
            <MailCheck className="w-12 h-12 text-bcs-green mx-auto mb-4" />
            <h1 className="font-serif text-2xl text-bcs-green mb-2">You’re unsubscribed</h1>
            <p className="text-gray-600 mb-6">
              Sorry to see you go. Changed your mind?
            </p>
            <button
              onClick={() => call("PUT")}
              disabled={loading}
              className="text-sm text-bcs-green underline disabled:opacity-50"
            >
              Re-subscribe
            </button>
          </>
        )}

        {state === "resubscribed" && (
          <>
            <MailCheck className="w-12 h-12 text-bcs-green mx-auto mb-4" />
            <h1 className="font-serif text-2xl text-bcs-green mb-2">Welcome back</h1>
            <p className="text-gray-600">You’re subscribed again.</p>
          </>
        )}

        {state === "error" && (
          <>
            <MailX className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="font-serif text-2xl text-gray-900 mb-2">That link didn’t work</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/contact" className="text-sm text-bcs-green underline">
              Contact us and we’ll sort it out
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
