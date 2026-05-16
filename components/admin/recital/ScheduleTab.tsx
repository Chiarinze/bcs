"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Users } from "lucide-react";
import { formatRecitalDate } from "@/lib/recital";
import type { RecitalBooking, RecitalDaySlotInfo } from "@/types";

export default function ScheduleTab() {
  const [days, setDays] = useState<RecitalDaySlotInfo[]>([]);
  const [maxPerDay, setMaxPerDay] = useState(6);
  const [cutoff, setCutoff] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookings, setBookings] = useState<RecitalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/recital/availability");
      if (res.ok) {
        const j = await res.json();
        setDays(j.days || []);
        setMaxPerDay(j.max_per_day);
        setCutoff(j.cutoff_date);
        if (j.days && j.days.length > 0) {
          setSelectedDate(j.days[0].date);
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    (async () => {
      setLoadingDay(true);
      const res = await fetch(`/api/admin/recital/bookings?date=${selectedDate}`);
      if (res.ok) setBookings(await res.json());
      setLoadingDay(false);
    })();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
        <Loader2 className="w-6 h-6 mx-auto text-gray-300 animate-spin" />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
        <CalendarDays className="w-10 h-10 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No Fridays remaining before the cutoff.</p>
        {cutoff && (
          <p className="text-xs text-gray-400 mt-1">Cutoff: {formatRecitalDate(cutoff)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Friday grid */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 lg:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Fridays</h2>
          <p className="text-xs text-gray-500">{maxPerDay} slots/day</p>
        </div>
        <div className="space-y-2">
          {days.map((d) => {
            const used = maxPerDay - d.remaining;
            const isSel = selectedDate === d.date;
            return (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                  isSel
                    ? "border-bcs-green bg-bcs-green/5"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-bcs-green">
                      {used}/{maxPerDay}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {d.full ? "full" : `${d.remaining} open`}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Roster for the selected day */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              {selectedDate ? formatRecitalDate(selectedDate) : "Select a Friday"}
            </h2>
            <p className="text-xs text-gray-500">
              {bookings.length} booking{bookings.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {loadingDay ? (
          <Loader2 className="w-5 h-5 text-gray-300 animate-spin mx-auto my-8" />
        ) : bookings.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No bookings on this day yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-bcs-green/10 grid place-items-center font-bold text-bcs-green">
                  {b.slot_number}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {b.profile?.first_name} {b.profile?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {b.profile?.choir_part || b.profile?.ensemble_arm || "—"} ·{" "}
                    <span className="italic">{b.chosen_piece}</span>
                  </p>
                </div>
                <StatusBadge status={b.status} score={b.total_score} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, score }: { status: string; score: number }) {
  if (status === "passed") {
    return (
      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        Passed · {score}/100
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
        Failed · {score}/100
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
      Scheduled
    </span>
  );
}
