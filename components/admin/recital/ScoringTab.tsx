"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { RECITAL_RUBRIC, RECITAL_MAX_PER_CRITERION, formatRecitalDate } from "@/lib/recital";
import type { RecitalBooking } from "@/types";

export default function ScoringTab() {
  const [bookings, setBookings] = useState<RecitalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/recital/bookings?status=scheduled");
    if (res.ok) {
      setBookings(await res.json());
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Auto-select first available date once bookings load
  useEffect(() => {
    if (!selectedDate && bookings.length) setSelectedDate(bookings[0].recital_date);
  }, [bookings, selectedDate]);

  const datesWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) map.set(b.recital_date, (map.get(b.recital_date) || 0) + 1);
    return Array.from(map.entries()).sort();
  }, [bookings]);

  const dayBookings = useMemo(
    () => bookings.filter((b) => b.recital_date === selectedDate),
    [bookings, selectedDate]
  );

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
        <Loader2 className="w-6 h-6 mx-auto text-gray-300 animate-spin" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500">
        No scheduled bookings waiting to be scored.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Date with scheduled bookings
        </p>
        <div className="flex flex-wrap gap-2">
          {datesWithCounts.map(([date, count]) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                selectedDate === date
                  ? "bg-bcs-green text-white border-bcs-green"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              · {count}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        {selectedDate ? formatRecitalDate(selectedDate) : ""}
      </h2>

      <div className="space-y-4">
        {dayBookings.map((b) => (
          <ScoreCard key={b.id} booking={b} onScored={load} />
        ))}
      </div>
    </div>
  );
}

function ScoreCard({ booking, onScored }: { booking: RecitalBooking; onScored: () => void }) {
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(RECITAL_RUBRIC.map((c) => [c.key, ""]))
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = RECITAL_RUBRIC.reduce(
    (sum, c) => sum + (Number(scores[c.key]) || 0),
    0
  );

  async function submit() {
    // Validate all scores filled with integers in range
    for (const c of RECITAL_RUBRIC) {
      const raw = scores[c.key];
      const n = Number(raw);
      if (raw === "" || !Number.isInteger(n) || n < 0 || n > RECITAL_MAX_PER_CRITERION) {
        setError(`Enter ${c.label} as an integer 0–${RECITAL_MAX_PER_CRITERION}`);
        return;
      }
    }
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/admin/recital/bookings/${booking.id}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(
          RECITAL_RUBRIC.map((c) => [c.key, Number(scores[c.key])])
        ),
        notes: notes.trim() || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Could not save score");
      return;
    }
    onScored();
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-bcs-green/10 grid place-items-center font-bold text-bcs-green">
          {booking.slot_number}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">
            {booking.profile?.first_name} {booking.profile?.last_name}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {booking.profile?.choir_part || booking.profile?.ensemble_arm || "—"} ·{" "}
            <span className="italic">{booking.chosen_piece}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {RECITAL_RUBRIC.map((c) => (
          <div key={c.key}>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              {c.label}{" "}
              <span className="normal-case text-gray-400 font-normal">
                /{RECITAL_MAX_PER_CRITERION}
              </span>
            </label>
            <input
              type="number"
              min={0}
              max={RECITAL_MAX_PER_CRITERION}
              value={scores[c.key]}
              onChange={(e) =>
                setScores((prev) => ({ ...prev, [c.key]: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-bcs-green focus:outline-none focus:ring-2 focus:ring-bcs-green/20 text-sm text-center"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-bcs-green focus:outline-none focus:ring-2 focus:ring-bcs-green/20 text-sm"
          placeholder="Feedback for the member..."
        />
      </div>

      {error && (
        <div className="mb-3 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-gray-700">
          Total:{" "}
          <span
            className={`font-bold text-lg ${
              total >= 65 ? "text-emerald-700" : total > 0 ? "text-red-700" : "text-gray-400"
            }`}
          >
            {total}
          </span>
          /100{" "}
          <span className="text-xs text-gray-400 ml-1">
            ({total >= 65 ? "would pass" : "would fail"} · pass mark 65)
          </span>
        </div>
        <Button onClick={submit} loading={saving} className="text-sm py-2">
          Submit score
        </Button>
      </div>
    </div>
  );
}
