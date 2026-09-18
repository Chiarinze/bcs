"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import Button from "@/components/ui/Button";
import { Users, Upload, Download, Plus, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Subscriber, SubscriberStatus } from "@/types";

type Filter = "all" | SubscriberStatus;

export default function AdminSubscribersPage() {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ subscribed: 0, unsubscribed: 0 });
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page) });
    if (filter !== "all") qs.set("status", filter);
    if (query) qs.set("q", query);
    const res = await fetch(`/api/admin/subscribers?${qs}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.subscribers);
      setTotal(data.total);
      setCounts(data.counts);
      setPageSize(data.pageSize);
    }
    setLoading(false);
  }, [page, filter, query]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setNotice("");
    const res = await fetch("/api/admin/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, name: newName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) alert(data.error || "Failed to add");
    else {
      setNewEmail("");
      setNewName("");
      await load();
    }
    setAdding(false);
  }

  async function importCsv(file: File) {
    setBusy(true);
    setNotice("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/subscribers/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) alert(data.error || "Import failed");
    else setNotice(`Imported ${data.added} contact${data.added === 1 ? "" : "s"} (${data.skipped} skipped as invalid or duplicate).`);
    await load();
    setBusy(false);
  }

  async function setStatus(id: string, status: SubscriberStatus) {
    setBusy(true);
    await fetch(`/api/admin/subscribers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setBusy(false);
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (!ids.length || !confirm(`Permanently delete ${ids.length} contact${ids.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    await fetch("/api/admin/subscribers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setSelected(new Set());
    await load();
    setBusy(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-bcs-green" /> Subscribers
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {counts.subscribed} subscribed · {counts.unsubscribed} unsubscribed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900" loading={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => window.open("/api/admin/subscribers/export", "_blank")}
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            {selected.size > 0 && (
              <Button variant="danger" loading={busy} onClick={deleteSelected}>
                <Trash2 className="w-4 h-4" /> Delete ({selected.size})
              </Button>
            )}
          </div>
        </div>

        {notice && <div className="bg-bcs-green/10 text-bcs-green text-sm rounded-xl px-4 py-3">{notice}</div>}

        <form onSubmit={add} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-bcs-green">Email</label>
            <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-bcs-green">Name (optional)</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <Button type="submit" loading={adding}>
            <Plus className="w-4 h-4" /> Add
          </Button>
          <p className="w-full text-xs text-gray-400">
            CSV import expects an <code>email</code> column and optionally <code>name</code> (or first/last name). People who unsubscribed are never re-added.
          </p>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 border-b border-gray-200">
            {(["all", "subscribed", "unsubscribed"] as Filter[]).map((f) => (
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(q.trim());
              setPage(1);
            }}
            className="ml-auto flex items-center gap-2"
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name" className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm" />
            <button type="submit" className="p-2 text-gray-500 hover:text-bcs-green"><Search className="w-4 h-4" /></button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                  />
                </th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Name</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No subscribers.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(r.id);
                          else next.delete(r.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-900 break-all">{r.email}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{r.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell capitalize">{r.source}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${r.status === "subscribed" ? "bg-bcs-green/10 text-bcs-green" : "bg-gray-100 text-gray-500"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setStatus(r.id, r.status === "subscribed" ? "unsubscribed" : "subscribed")}
                        disabled={busy}
                        className="text-xs text-gray-600 underline disabled:opacity-50"
                      >
                        {r.status === "subscribed" ? "Unsubscribe" : "Re-subscribe"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
            <span>{total} contact{total === 1 ? "" : "s"}</span>
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
