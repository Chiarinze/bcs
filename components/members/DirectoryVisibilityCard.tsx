"use client";

import { useState } from "react";
import { Eye, EyeOff, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import type { DirectoryRequest } from "@/types";

interface Props {
  hidden: boolean;
  request: DirectoryRequest | null;
  requestAt: string | null;
  verified: boolean;
  slug: string | null;
  onChange: (next: { hidden: boolean; request: DirectoryRequest | null; requestAt: string | null }) => void;
}

/**
 * Lets a member ask to be removed from (or restored to) the public
 * /members directory. Nothing changes until an admin approves.
 */
export default function DirectoryVisibilityCard({
  hidden,
  request,
  requestAt,
  verified,
  slug,
  onChange,
}: Props) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function send(action: "hide" | "show" | "cancel") {
    setLoading(true);
    setError("");
    const res = await fetch("/api/profile/directory-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: note.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Request failed");
    } else {
      setNote("");
      onChange({
        hidden: data.directory_hidden,
        request: data.directory_request,
        requestAt: data.directory_request_at,
      });
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            {hidden ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-bcs-green" />}
            Public members directory
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {!verified
              ? "Once your membership is verified, your name, photo, part and bio will appear on the public Members page."
              : hidden
                ? "Your profile is currently hidden from the public Members page."
                : "Your name, photo, part and bio are shown on the public Members page."}
          </p>
        </div>
        {verified && !hidden && slug && (
          <a
            href={`/members/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-bcs-green underline whitespace-nowrap"
          >
            View
          </a>
        )}
      </div>

      {verified && request && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Your request to be {request === "hide" ? "hidden" : "shown"} is awaiting admin approval
            {requestAt && ` (sent ${new Date(requestAt).toLocaleDateString("en-NG")})`}.
          </p>
          <button
            onClick={() => send("cancel")}
            disabled={loading}
            className="text-xs text-amber-800 underline whitespace-nowrap disabled:opacity-50"
          >
            Cancel request
          </button>
        </div>
      )}

      {verified && !request && (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={hidden ? "Optional note to the admin" : "Optional: tell the admin why you'd like to be hidden"}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition"
          />
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            loading={loading}
            onClick={() => send(hidden ? "show" : "hide")}
          >
            {hidden ? "Request to be shown again" : "Request to hide my profile"}
          </Button>
          <p className="text-xs text-gray-400">An administrator must approve this before it takes effect.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
