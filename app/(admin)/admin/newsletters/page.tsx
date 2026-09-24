"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layouts/AdminLayout";
import Button from "@/components/ui/Button";
import { Plus, Send, Users, Trash2 } from "lucide-react";
import type { Newsletter, NewsletterStatus } from "@/types";

const STATUS_STYLE: Record<NewsletterStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  queued: "bg-amber-100 text-amber-800",
  sending: "bg-blue-100 text-blue-800",
  paused: "bg-amber-100 text-amber-800",
  sent: "bg-bcs-green/10 text-bcs-green",
  cancelled: "bg-red-50 text-red-600",
};

export default function AdminNewslettersPage() {
  const [items, setItems] = useState<Newsletter[]>([]);
  const [subscribed, setSubscribed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/admin/newsletters");
    if (res.ok) {
      const data = await res.json();
      setItems(data.newsletters);
      setSubscribed(data.subscribed);
    }
    setLoading(false);
  }

  async function remove(n: Newsletter) {
    if (!confirm(`Delete “${n.subject}”?`)) return;
    setBusy(n.id);
    const res = await fetch(`/api/admin/newsletters/${n.id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json()).error || "Delete failed");
    await load();
    setBusy(null);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Send className="w-6 h-6 text-bcs-green" /> Newsletters
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              {subscribed} active subscriber{subscribed === 1 ? "" : "s"} ·{" "}
              <Link href="/admin/subscribers" className="underline">
                manage list
              </Link>
            </p>
          </div>
          <Link href="/admin/newsletters/new">
            <Button>
              <Plus className="w-4 h-4" /> New newsletter
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-sm text-gray-400">No newsletters yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {items.map((n) => {
              const progress = n.total_recipients ? Math.round((n.sent_count / n.total_recipients) * 100) : 0;
              return (
                <div key={n.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/newsletters/${n.id}`} className="font-medium text-gray-900 hover:underline">
                      {n.subject}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="capitalize">{n.kind}</span>
                      {n.audience === "selected" && " · selected recipients"} ·{" "}
                      {n.status === "draft"
                        ? `edited ${new Date(n.updated_at).toLocaleDateString("en-NG")}`
                        : `${n.sent_count}/${n.total_recipients} sent${n.failed_count ? `, ${n.failed_count} failed` : ""}`}
                      {n.queued_at && ` · queued ${new Date(n.queued_at).toLocaleDateString("en-NG")}`}
                    </p>
                    {(n.status === "queued" || n.status === "sending") && (
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                        <div className="h-full bg-bcs-green" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[n.status]}`}>
                    {n.status}
                  </span>
                  {n.status !== "queued" && n.status !== "sending" && (
                    <button
                      onClick={() => remove(n)}
                      disabled={busy === n.id}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
