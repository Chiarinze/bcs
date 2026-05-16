"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { Check, Loader2, Mail, Search, X } from "lucide-react";
import type { RecitalQuery } from "@/types";

type EligibleMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  photo_url: string | null;
  choir_part: string | null;
  ensemble_arm: string | null;
  has_open_query: boolean;
};

export default function IssueQueriesTab() {
  const [eligible, setEligible] = useState<EligibleMember[]>([]);
  const [queries, setQueries] = useState<RecitalQuery[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    const [elRes, qRes] = await Promise.all([
      fetch("/api/admin/recital/eligible"),
      fetch("/api/admin/recital/queries"),
    ]);
    if (elRes.ok) setEligible(await elRes.json());
    if (qRes.ok) setQueries(await qRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (m) =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.choir_part || "").toLowerCase().includes(q)
    );
  }, [eligible, search]);

  const selectableIds = useMemo(
    () => filtered.filter((m) => !m.has_open_query).map((m) => m.id),
    [filtered]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function issueSelected() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Issue a recital query to ${selected.size} member${selected.size === 1 ? "" : "s"}? They will be emailed immediately.`
      )
    )
      return;

    setIssuing(true);
    setFeedback(null);
    const res = await fetch("/api/admin/recital/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_ids: Array.from(selected) }),
    });
    const json = await res.json();
    setIssuing(false);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: json.error || "Failed to issue queries" });
      return;
    }
    setFeedback({
      kind: "ok",
      msg: `${json.issued} quer${json.issued === 1 ? "y" : "ies"} sent${
        json.skipped ? ` · ${json.skipped} skipped (already queried)` : ""
      }.`,
    });
    setSelected(new Set());
    load();
  }

  async function issueAll() {
    const remaining = eligible.filter((m) => !m.has_open_query).length;
    if (remaining === 0) {
      setFeedback({ kind: "ok", msg: "Every eligible member already has an open query." });
      return;
    }
    if (
      !confirm(
        `Issue a recital query to ALL ${remaining} eligible members who don't already have one? They will be emailed immediately.`
      )
    )
      return;

    setIssuing(true);
    setFeedback(null);
    const res = await fetch("/api/admin/recital/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const json = await res.json();
    setIssuing(false);
    if (!res.ok) {
      setFeedback({ kind: "err", msg: json.error || "Failed to issue queries" });
      return;
    }
    setFeedback({
      kind: "ok",
      msg: `${json.issued} quer${json.issued === 1 ? "y" : "ies"} sent${
        json.skipped ? ` · ${json.skipped} skipped (already queried)` : ""
      }.`,
    });
    load();
  }

  const queryCount = queries.length;
  const clearedCount = queries.filter((q) => q.status === "cleared").length;
  const pendingCount = queries.filter((q) => q.status === "pending").length;
  const bookedCount = queries.filter((q) => q.status === "booked").length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total queries" value={queryCount} />
        <StatCard label="Pending" value={pendingCount} accent="amber" />
        <StatCard label="Booked" value={bookedCount} accent="blue" />
        <StatCard label="Cleared" value={clearedCount} accent="green" />
      </div>

      {/* Action bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Issue new queries</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white text-sm py-2"
              onClick={issueAll}
              loading={issuing}
            >
              <Mail className="w-4 h-4" />
              Query ALL eligible
            </Button>
            <Button
              className="text-sm py-2"
              disabled={selected.size === 0 || issuing}
              loading={issuing}
              onClick={issueSelected}
            >
              <Mail className="w-4 h-4" />
              Query selected ({selected.size})
            </Button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              feedback.kind === "ok"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <div className="mt-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or choir part..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-bcs-green focus:outline-none focus:ring-2 focus:ring-bcs-green/20 text-sm"
          />
        </div>

        {/* Members list */}
        <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-bcs-green"
              />
              Select all visible ({selectableIds.length})
            </label>
            <p className="text-xs text-gray-500">
              {eligible.length} eligible · {eligible.filter((m) => m.has_open_query).length} already queried
            </p>
          </div>
          <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No members match your search.</p>
            ) : (
              filtered.map((m) => {
                const disabled = m.has_open_query;
                const checked = selected.has(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      disabled
                        ? "bg-gray-50/50 cursor-not-allowed opacity-70"
                        : "hover:bg-gray-50 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(m.id)}
                      className="accent-bcs-green"
                    />
                    {m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photo_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-bcs-green/10 grid place-items-center text-bcs-green text-xs font-semibold">
                        {m.first_name.charAt(0)}
                        {m.last_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {m.email}
                        {m.choir_part ? ` · ${m.choir_part}` : ""}
                      </p>
                    </div>
                    {disabled && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Queried
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* All queries table */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">All queries</h2>
          <p className="text-xs text-gray-500">{queries.length} total</p>
        </div>
        {queries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No queries issued yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Member</th>
                  <th className="text-left font-medium px-4 py-2">Issued</th>
                  <th className="text-left font-medium px-4 py-2">Status</th>
                  <th className="text-left font-medium px-4 py-2">Latest booking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queries.map((q) => (
                  <tr key={q.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {q.profile?.first_name} {q.profile?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{q.profile?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(q.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={q.status} />
                    </td>
                    <td className="px-4 py-3">
                      {q.latest_booking ? (
                        <div className="text-xs text-gray-600">
                          <div>
                            {new Date(q.latest_booking.recital_date + "T00:00:00").toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}{" "}
                            · slot #{q.latest_booking.slot_number}
                          </div>
                          <div className="text-gray-400">
                            {q.latest_booking.status === "scheduled"
                              ? `Piece: ${q.latest_booking.chosen_piece}`
                              : `${q.latest_booking.total_score}/100 · ${q.latest_booking.status}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "blue" | "green";
}) {
  const accents = {
    amber: "text-amber-700 bg-amber-50",
    blue: "text-blue-700 bg-blue-50",
    green: "text-emerald-700 bg-emerald-50",
  } as const;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          accent ? accents[accent].split(" ")[0] : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    booked: "bg-blue-50 text-blue-700 border-blue-200",
    cleared: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
        map[status] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {status === "cleared" ? <Check className="w-3 h-3" /> : status === "pending" ? <X className="w-3 h-3" /> : null}
      {status}
    </span>
  );
}
