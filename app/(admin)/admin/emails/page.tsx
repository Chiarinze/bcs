"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { MailCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { EmailLogEntry, EmailLogStatus } from "@/types";

type Filter = "all" | EmailLogStatus;

const STATUS_STYLE: Record<EmailLogStatus, string> = {
  queued: "bg-amber-100 text-amber-800",
  sent: "bg-bcs-green/10 text-bcs-green",
  failed: "bg-red-50 text-red-600",
  unknown: "bg-gray-100 text-gray-500",
};

export default function AdminEmailsPage() {
  const [entries, setEntries] = useState<EmailLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sentToday, setSentToday] = useState(0);
  const [dailyCap, setDailyCap] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page) });
    if (filter !== "all") qs.set("status", filter);
    if (kind) qs.set("kind", kind);
    if (query) qs.set("q", query);
    const res = await fetch(`/api/admin/emails?${qs}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
      setPageSize(data.pageSize);
      setKinds(data.kinds);
      setSentToday(data.sentToday);
      setDailyCap(data.dailyCap);
    }
    setLoading(false);
  }, [page, filter, kind, query]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <MailCheck className="w-6 h-6 text-bcs-green" /> Email log
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Every email handed to Resend by the database. “Sent” means Resend accepted it; status updates within ~5 minutes.
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-gray-900">
              {sentToday}
              {dailyCap ? ` / ${dailyCap}` : ""} today
            </p>
            <p className="text-xs text-gray-400">counts toward the daily limit</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 border-b border-gray-200">
            {(["all", "sent", "queued", "failed", "unknown"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${filter === f ? "border-bcs-green text-bcs-green" : "border-transparent text-gray-500"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All kinds</option>
            {kinds.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(q.trim());
              setPage(1);
            }}
            className="ml-auto flex items-center gap-2"
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipient or subject" className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
            <button type="submit" className="p-2 text-gray-500 hover:text-bcs-green"><Search className="w-4 h-4" /></button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-600">
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">To</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Subject</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Kind</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-gray-400">Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No emails logged yet.</td></tr>
              ) : (
                entries.map((e) => (
                  <Fragment key={e.id}>
                    <tr onClick={() => setOpen(open === e.id ? null : e.id)} className="hover:bg-gray-50/60 cursor-pointer">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(e.created_at).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="px-4 py-3 text-gray-900 break-all">{e.to_email}</td>
                      <td className="px-4 py-3 text-gray-700 hidden md:table-cell truncate max-w-xs">{e.subject}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{e.kind}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[e.status]}`}>{e.status}</span>
                      </td>
                    </tr>
                    {open === e.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-3 text-xs text-gray-600 space-y-1">
                          <p><span className="text-gray-400">Subject:</span> {e.subject}</p>
                          <p><span className="text-gray-400">From:</span> {e.from_email || "—"}</p>
                          {e.status_code && <p><span className="text-gray-400">Resend response:</span> HTTP {e.status_code}</p>}
                          {e.error && <p className="text-red-600"><span className="text-gray-400">Error:</span> {e.error}</p>}
                          {e.resolved_at && <p><span className="text-gray-400">Resolved:</span> {new Date(e.resolved_at).toLocaleString("en-NG")}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
            <span>{total} entr{total === 1 ? "y" : "ies"}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span>{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
