"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Check, X, User } from "lucide-react";
import type { DirectoryRequest, MembershipStatus } from "@/types";

interface Row {
  id: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  membership_status: MembershipStatus;
  directory_hidden: boolean;
  directory_request: DirectoryRequest | null;
  directory_request_at: string | null;
  directory_request_note: string | null;
}

function Avatar({ row }: { row: Row }) {
  return row.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={row.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-bcs-green/10 flex items-center justify-center">
      <User className="w-4 h-4 text-bcs-green" />
    </div>
  );
}

/**
 * Admin panel: approve/decline members' requests to hide from (or return
 * to) the public directory, and see who is currently hidden.
 */
export default function DirectoryRequests() {
  const [pending, setPending] = useState<Row[]>([]);
  const [hidden, setHidden] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/members/directory-requests");
    if (res.ok) {
      const data = await res.json();
      setPending(data.pending);
      setHidden(data.hidden);
    }
    setLoading(false);
  }

  async function act(id: string, action: "approve" | "reject" | "show") {
    setBusy(id);
    const res = await fetch(`/api/members/${id}/directory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Action failed");
    }
    await load();
    setBusy(null);
  }

  if (loading || (pending.length === 0 && hidden.length === 0)) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-bcs-green" />
          Public directory
          {pending.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pending.length} pending
            </span>
          )}
        </h2>
        {hidden.length > 0 && (
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="text-xs text-gray-500 underline"
          >
            {showHidden ? "Hide" : "Show"} hidden members ({hidden.length})
          </button>
        )}
      </div>

      {pending.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {pending.map((row) => (
            <li key={row.id} className="py-3 flex flex-wrap items-center gap-3">
              <Avatar row={row} />
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm text-gray-900">
                  {row.first_name} {row.last_name}
                  <span className="text-gray-500">
                    {" "}wants to be {row.directory_request === "hide" ? "hidden from" : "shown in"} the directory
                  </span>
                </p>
                {row.directory_request_note && (
                  <p className="text-xs text-gray-500 italic mt-0.5">“{row.directory_request_note}”</p>
                )}
                {row.directory_request_at && (
                  <p className="text-[11px] text-gray-400">
                    {new Date(row.directory_request_at).toLocaleString("en-NG")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => act(row.id, "approve")}
                  disabled={busy === row.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bcs-green/10 text-bcs-green text-xs font-medium hover:bg-bcs-green/20 disabled:opacity-50 transition"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => act(row.id, "reject")}
                  disabled={busy === row.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition"
                >
                  <X className="w-3.5 h-3.5" /> Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showHidden && hidden.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Currently hidden</p>
          <ul className="divide-y divide-gray-50">
            {hidden.map((row) => (
              <li key={row.id} className="py-2 flex items-center gap-3">
                <Avatar row={row} />
                <p className="flex-1 text-sm text-gray-800">
                  {row.first_name} {row.last_name}
                </p>
                <button
                  onClick={() => {
                    if (confirm("Make this member visible in the public directory?")) act(row.id, "show");
                  }}
                  disabled={busy === row.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition"
                >
                  <Eye className="w-3.5 h-3.5" /> Unhide
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
