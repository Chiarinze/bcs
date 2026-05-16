"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import {
  CalendarDays,
  Check,
  Download,
  FileText,
  Loader2,
  Music2,
  RotateCcw,
  X,
} from "lucide-react";
import {
  RECITAL_RUBRIC,
  formatRecitalDate,
} from "@/lib/recital";
import type {
  RecitalBooking,
  RecitalConfig,
  RecitalDaySlotInfo,
  RecitalQuery,
} from "@/types";

type MeResponse = {
  config: RecitalConfig | null;
  query: RecitalQuery | null;
  bookings: RecitalBooking[];
};

type AvailabilityResponse = {
  cutoff_date: string;
  max_per_day: number;
  today: string;
  days: RecitalDaySlotInfo[];
};

export default function MemberRecitalClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // booking form
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [piece, setPiece] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [missingDate, setMissingDate] = useState(false);
  const [missingPiece, setMissingPiece] = useState(false);

  async function load() {
    setLoading(true);
    const [meRes, avRes] = await Promise.all([
      fetch("/api/recital/me"),
      fetch("/api/recital/availability"),
    ]);
    if (meRes.ok) setMe(await meRes.json());
    if (avRes.ok) setAvailability(await avRes.json());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const activeBooking = useMemo(
    () => (me?.bookings || []).find((b) => b.status === "scheduled") || null,
    [me]
  );

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
        <Loader2 className="w-6 h-6 mx-auto text-gray-300 animate-spin" />
      </div>
    );
  }

  // No query at all (member hasn't been queried, or already cleared one)
  if (!me?.query) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
        <Music2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">No active recital query</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          You don&apos;t currently have a compulsory recital query against you. If one is issued,
          you&apos;ll see the details here.
        </p>
      </div>
    );
  }

  const query = me.query;
  const cleared = query.status === "cleared";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compulsory Recital</h1>
          <p className="text-sm text-gray-500 mt-1">
            BCS May–August Compulsory Recital Exercise
          </p>
        </div>
        <a
          href="/recital-repertoire.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white transition"
        >
          <Download className="w-4 h-4" /> Repertoire PDF
        </a>
      </div>

      {/* Query status banner */}
      {cleared ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 grid place-items-center flex-shrink-0">
              <Check className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-semibold text-emerald-900">Your query has been cleared</h2>
              <p className="text-sm text-emerald-800 mt-1">
                You passed your recital. Well done! Your record on file is updated.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 grid place-items-center flex-shrink-0">
              <X className="w-5 h-5 text-red-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-red-900">You have an active query</h2>
              <p className="text-sm text-red-800 mt-1">
                Issued {new Date(query.issued_at).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                . To clear it, perform your recital and score at least{" "}
                <strong>{me.config?.pass_mark ?? 65}/100</strong> before{" "}
                <strong>
                  {me.config?.cutoff_date ? formatRecitalDate(me.config.cutoff_date) : "the cutoff"}
                </strong>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active booking */}
      {activeBooking && (
        <ActiveBookingCard
          booking={activeBooking}
          onChanged={load}
          availability={availability}
        />
      )}

      {/* Book form */}
      {!cleared && !activeBooking && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Book your recital</h2>
          <p className="text-xs text-gray-500 mb-4">
            Pick any Friday with open slots, and the piece you&apos;ll perform from your
            assigned options in the PDF.
          </p>

          {availability && availability.days.length === 0 ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              No Fridays remain before the cutoff. Contact the admin urgently.
            </p>
          ) : (
            <>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Friday
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availability?.days.map((d) => {
                  const isSel = selectedDate === d.date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      disabled={d.full}
                      onClick={() => {
                        setSelectedDate(d.date);
                        setMissingDate(false);
                      }}
                      className={`text-left px-4 py-3 rounded-xl border transition ${
                        d.full
                          ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
                          : isSel
                            ? "bg-bcs-green/5 border-bcs-green"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {d.full
                              ? "Full"
                              : `${d.remaining} of ${availability.max_per_day} slot${
                                  d.remaining === 1 ? "" : "s"
                                } open`}
                          </p>
                        </div>
                        {isSel && <Check className="w-4 h-4 text-bcs-green" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {missingDate && (
                <p className="mt-2 text-xs text-red-700 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Please pick a Friday above.
                </p>
              )}

              <label
                htmlFor="piece"
                className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2 mt-5"
              >
                Piece you&apos;ll perform
              </label>
              <input
                id="piece"
                type="text"
                value={piece}
                onChange={(e) => {
                  setPiece(e.target.value);
                  if (e.target.value.trim()) setMissingPiece(false);
                }}
                placeholder='e.g. "Caro mio ben" (Giordani)'
                aria-invalid={missingPiece}
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm ${
                  missingPiece
                    ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                    : "border-gray-200 focus:border-bcs-green focus:ring-bcs-green/20"
                }`}
              />
              {missingPiece ? (
                <p className="mt-1 text-xs text-red-700 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Enter the piece you&apos;ll perform.
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1">
                  Use Option A or Option B from your assignment in the repertoire PDF.
                </p>
              )}

              {formError && (
                <p className="mt-3 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="mt-5">
                <Button
                  loading={submitting}
                  disabled={submitting}
                  onClick={async () => {
                    const noDate = !selectedDate;
                    const noPiece = !piece.trim();
                    setMissingDate(noDate);
                    setMissingPiece(noPiece);
                    if (noDate || noPiece) return;

                    setSubmitting(true);
                    setFormError(null);
                    const res = await fetch("/api/recital/bookings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        recital_date: selectedDate,
                        chosen_piece: piece.trim(),
                      }),
                    });
                    const json = await res.json();
                    setSubmitting(false);
                    if (!res.ok) {
                      setFormError(json.error || "Could not book your slot");
                      return;
                    }
                    setSelectedDate("");
                    setPiece("");
                    setMissingDate(false);
                    setMissingPiece(false);
                    load();
                  }}
                >
                  <CalendarDays className="w-4 h-4" /> Book this slot
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* History */}
      <BookingHistory bookings={me.bookings} />

      {/* Compliance notice */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-gray-400 mt-1" />
          <div className="text-sm text-gray-600 leading-relaxed">
            <p className="mb-1">
              <strong>Reminder:</strong> No member will be cleared online if they have not met the
              prescribed pass mark. Failure to secure clearance will be treated as insubordination
              and will attract sanctions.
            </p>
            {/* <p>
              Diaspora members should contact the Director of Training and Research for special
              guidelines.
            </p> */}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveBookingCard({
  booking,
  onChanged,
  availability,
}: {
  booking: RecitalBooking;
  onChanged: () => void;
  availability: AvailabilityResponse | null;
}) {
  const [editing, setEditing] = useState(false);
  const [newDate, setNewDate] = useState(booking.recital_date);
  const [newPiece, setNewPiece] = useState(booking.chosen_piece);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock edits within 24h
  const lockedForEdit =
    new Date(booking.recital_date + "T00:00:00").getTime() <=
    Date.now() + 24 * 60 * 60 * 1000;

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/recital/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recital_date: newDate !== booking.recital_date ? newDate : undefined,
        chosen_piece: newPiece !== booking.chosen_piece ? newPiece.trim() : undefined,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Could not update");
      return;
    }
    setEditing(false);
    onChanged();
  }

  return (
    <div className="bg-white border-2 border-bcs-green rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-semibold text-gray-900">Your scheduled recital</h2>
        {!editing && !lockedForEdit && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-bcs-green hover:underline inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Change date or piece
          </button>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Date" value={formatRecitalDate(booking.recital_date)} />
          <Field label="Slot" value={`#${booking.slot_number} of 6`} />
          <Field label="Piece" value={booking.chosen_piece} italic />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Friday
            </label>
            <select
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value={booking.recital_date}>
                {formatRecitalDate(booking.recital_date)} (current)
              </option>
              {(availability?.days || [])
                .filter((d) => d.date !== booking.recital_date && !d.full)
                .map((d) => (
                  <option key={d.date} value={d.date}>
                    {formatRecitalDate(d.date)} — {d.remaining} slots open
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              Piece
            </label>
            <input
              type="text"
              value={newPiece}
              onChange={(e) => setNewPiece(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          {error && (
            <p className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={save} loading={saving} className="text-sm py-2">
              Save changes
            </Button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setNewDate(booking.recital_date);
                setNewPiece(booking.chosen_piece);
                setError(null);
              }}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {lockedForEdit && !editing && (
        <p className="text-xs text-gray-400 mt-3">
          Changes are locked within 24 hours of the recital.
        </p>
      )}
    </div>
  );
}

function BookingHistory({ bookings }: { bookings: RecitalBooking[] }) {
  const past = bookings.filter((b) => b.status !== "scheduled");
  if (past.length === 0) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <h2 className="font-semibold text-gray-900 mb-3">Past attempts</h2>
      <div className="divide-y divide-gray-50">
        {past.map((b) => (
          <div key={b.id} className="py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {formatRecitalDate(b.recital_date)}
                </p>
                <p className="text-xs text-gray-500 italic truncate">{b.chosen_piece}</p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${
                    b.status === "passed" ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {b.total_score}/100 · {b.status}
                </p>
              </div>
            </div>
            {/* Rubric breakdown */}
            <div className="grid grid-cols-5 gap-1 mt-2 text-[10px] text-gray-500">
              {RECITAL_RUBRIC.map((c) => {
                const v = (b as unknown as Record<string, number | null>)[c.key];
                return (
                  <div key={c.key} className="bg-gray-50 rounded px-1.5 py-1 text-center">
                    <div className="font-semibold text-gray-700">{v ?? "—"}</div>
                    <div>{c.label}</div>
                  </div>
                );
              })}
            </div>
            {b.scorer_notes && (
              <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded px-3 py-2">
                <span className="font-medium">Notes: </span>
                {b.scorer_notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  italic,
}: {
  label: string;
  value: string;
  italic?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-bcs-green font-semibold mt-1 ${italic ? "italic" : ""}`}>{value}</p>
    </div>
  );
}
