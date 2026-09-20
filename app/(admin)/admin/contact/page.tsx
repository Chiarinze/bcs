"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/layouts/AdminLayout";
import Button from "@/components/ui/Button";
import { Mail, MailOpen, Reply, Trash2, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import usePolling from "@/hooks/usePolling";
import type { ContactMessage, ContactReply, ContactStatus } from "@/types";

type Filter = "all" | ContactStatus;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLE: Record<ContactStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  read: "bg-gray-100 text-gray-600",
  replied: "bg-bcs-green/10 text-bcs-green",
};

export default function AdminContactPage() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("m");

  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<{ message: ContactMessage; replies: ContactReply[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // `silent` skips the loading state so background refreshes don't flicker.
  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const qs = new URLSearchParams({ page: String(page) });
    if (filter !== "all") qs.set("status", filter);
    const res = await fetch(`/api/admin/contact?${qs}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      setTotal(data.total);
      setUnread(data.unread);
      setPageSize(data.pageSize);
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Pick up new messages while the inbox is open, visible and online.
  usePolling(() => loadList(true), 30000);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setReply("");
    setError("");
    fetch(`/api/admin/contact/${openId}`)
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        // Reflect the read state in the list without a refetch.
        if (data?.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === data.message.id ? { ...m, status: data.message.status } : m))
          );
          setUnread((u) => (data.message.status !== "new" ? Math.max(0, u - 1) : u));
        }
      })
      .finally(() => !cancelled && setDetailLoading(false));
    return () => {
      cancelled = true;
    };
  }, [openId]);

  async function sendReply() {
    if (!openId || !reply.trim()) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/admin/contact/${openId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to send reply");
    } else {
      setReply("");
      setDetail((d) =>
        d
          ? {
              message: { ...d.message, status: "replied" },
              replies: [...d.replies, data],
            }
          : d
      );
      setMessages((prev) => prev.map((m) => (m.id === openId ? { ...m, status: "replied" } : m)));
    }
    setSending(false);
  }

  async function deleteIds(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length === 1 ? "this message" : `${ids.length} messages`}? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/contact", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) alert("Delete failed");
    if (openId && ids.includes(openId)) setOpenId(null);
    setSelected(new Set());
    await loadList();
    setBusy(false);
  }

  async function deleteAll() {
    if (!confirm(`Delete ALL ${total} stored messages? This cannot be undone.`)) return;
    if (!confirm("Are you absolutely sure? Every message and reply will be permanently removed.")) return;
    setBusy(true);
    const res = await fetch("/api/admin/contact", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) alert("Delete failed");
    setOpenId(null);
    setSelected(new Set());
    await loadList();
    setBusy(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allOnPageSelected = messages.length > 0 && messages.every((m) => selected.has(m.id));

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Inbox className="w-6 h-6 text-bcs-green" /> Contact Inbox
              {unread > 0 && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{unread} new</span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Messages from the website contact form. Replies are emailed from info@.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button variant="danger" loading={busy} onClick={() => deleteIds([...selected])}>
                <Trash2 className="w-4 h-4" /> Delete selected ({selected.size})
              </Button>
            )}
            {total > 0 && (
              <button
                onClick={deleteAll}
                disabled={busy}
                className="text-xs text-red-600 underline disabled:opacity-50"
              >
                Delete all
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 border-b border-gray-200">
          {(["all", "new", "read", "replied"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition ${
                filter === f ? "border-bcs-green text-bcs-green" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5">
          {/* List */}
          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${openId ? "hidden lg:block" : ""}`}>
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(messages.map((m) => m.id)) : new Set())
                }
                className="rounded border-gray-300"
              />
              <span>{total} message{total === 1 ? "" : "s"}</span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  {page}/{totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <p className="p-6 text-sm text-gray-400">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="p-10 text-sm text-gray-400 text-center">No messages.</p>
            ) : (
              <ul className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                      openId === m.id ? "bg-bcs-green/5" : ""
                    }`}
                    onClick={() => setOpenId(m.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(m.id);
                        else next.delete(m.id);
                        setSelected(next);
                      }}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {m.status === "new" ? (
                          <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <MailOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                        <p className={`text-sm truncate ${m.status === "new" ? "font-semibold text-gray-900" : "text-gray-800"}`}>
                          {m.name}
                        </p>
                        <span className="ml-auto text-[11px] text-gray-400 shrink-0">{timeAgo(m.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">{m.subject}</p>
                      <p className="text-xs text-gray-400 truncate">{m.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${openId ? "" : "hidden lg:block"}`}>
            {!openId ? (
              <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-gray-400">
                Select a message to read it
              </div>
            ) : detailLoading || !detail ? (
              <p className="p-6 text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-5 border-b border-gray-100">
                  <button onClick={() => setOpenId(null)} className="lg:hidden text-xs text-gray-500 mb-2 inline-flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" /> Back to inbox
                  </button>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 break-words">{detail.message.subject}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {detail.message.name} ·{" "}
                        <a href={`mailto:${detail.message.email}`} className="text-bcs-green underline">
                          {detail.message.email}
                        </a>
                        {detail.message.phone && (
                          <>
                            {" "}·{" "}
                            <a href={`tel:${detail.message.phone}`} className="text-bcs-green underline">
                              {detail.message.phone}
                            </a>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(detail.message.created_at).toLocaleString("en-NG")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[detail.message.status]}`}>
                        {detail.message.status}
                      </span>
                      <button
                        onClick={() => deleteIds([detail.message.id])}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-5 flex-1 overflow-y-auto max-h-[50vh]">
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {detail.message.message}
                  </div>

                  {detail.replies.map((r) =>
                    r.direction === "inbound" ? (
                      <div key={r.id} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-[11px] text-gray-400 mb-1">
                          <Mail className="w-3 h-3 inline mr-1" />
                          {detail.message.name} replied by email ·{" "}
                          {new Date(r.created_at).toLocaleString("en-NG")}
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                      </div>
                    ) : (
                      <div key={r.id} className="ml-6 border-l-2 border-bcs-green/30 pl-4">
                        <p className="text-[11px] text-gray-400 mb-1">
                          <Reply className="w-3 h-3 inline mr-1" />
                          {r.sender ? `${r.sender.first_name} ${r.sender.last_name}` : "Admin"} ·{" "}
                          {new Date(r.created_at).toLocaleString("en-NG")}
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                      </div>
                    )
                  )}
                </div>

                <div className="p-5 border-t border-gray-100 space-y-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={5}
                    maxLength={10000}
                    placeholder={`Reply to ${detail.message.name.split(" ")[0]}… (sent from info@; their email replies come back into this thread)`}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm resize-y focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button onClick={sendReply} loading={sending} disabled={!reply.trim()}>
                    <Reply className="w-4 h-4" /> Send reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
