"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/layouts/AdminLayout";
import NewsletterComposer from "@/components/admin/NewsletterComposer";
import Button from "@/components/ui/Button";
import { Send, FlaskConical, Ban, RefreshCw } from "lucide-react";
import usePolling from "@/hooks/usePolling";
import type { Newsletter } from "@/types";

interface Detail {
  newsletter: Newsletter;
  stats: { pending: number; sending: number; sent: number; failed: number };
  failures: { email: string; last_error: string | null; attempts: number }[];
}

export default function NewsletterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [subscribed, setSubscribed] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/newsletters/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (res.ok) setDetail(await res.json());
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/admin/newsletters")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSubscribed(d.subscribed));
  }, [load]);

  // Live progress while a campaign is going out — only while this tab is
  // visible and online (see usePolling).
  const status = detail?.newsletter.status;
  usePolling(load, 30000, status === "queued" || status === "sending");

  async function action(path: "send" | "test" | "cancel") {
    if (path === "send") {
      const n = subscribed ?? 0;
      if (
        !confirm(
          `Send “${detail?.newsletter.subject}” to ${n} subscriber${n === 1 ? "" : "s"}?\n\nIt goes out gradually (max 80 per day) so it may take a few days to reach everyone. Make sure you have saved your latest changes.`
        )
      )
        return;
    }
    if (path === "cancel" && !confirm("Stop sending? Copies already sent cannot be recalled.")) return;

    setBusy(path);
    setNotice("");
    const res = await fetch(`/api/admin/newsletters/${id}/${path}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Action failed");
    } else if (path === "test") {
      setNotice(`Test copy sent to ${data.to}. Check the Email log if it does not arrive.`);
    } else if (path === "send") {
      setNotice(`Queued for ${data.queued} recipient${data.queued === 1 ? "" : "s"}.`);
    }
    await load();
    setBusy(null);
  }

  if (notFound) {
    return (
      <AdminLayout showBack>
        <p className="text-sm text-gray-500">Newsletter not found.</p>
      </AdminLayout>
    );
  }
  if (!detail) {
    return (
      <AdminLayout showBack>
        <p className="text-sm text-gray-400">Loading…</p>
      </AdminLayout>
    );
  }

  const { newsletter: n, stats, failures } = detail;
  const inProgress = n.status === "queued" || n.status === "sending";
  const done = stats.sent + stats.failed;
  const pct = n.total_recipients ? Math.round((done / n.total_recipients) * 100) : 0;

  return (
    <AdminLayout showBack>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{n.subject}</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {n.kind} · {n.status}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {n.status === "draft" && (
              <>
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900" loading={busy === "test"} onClick={() => action("test")}>
                  <FlaskConical className="w-4 h-4" /> Send me a test
                </Button>
                <Button loading={busy === "send"} onClick={() => action("send")}>
                  <Send className="w-4 h-4" /> Send to {subscribed ?? "…"} subscribers
                </Button>
              </>
            )}
            {inProgress && (
              <>
                <button onClick={load} className="p-2 text-gray-400 hover:text-bcs-green" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <Button variant="danger" loading={busy === "cancel"} onClick={() => action("cancel")}>
                  <Ban className="w-4 h-4" /> Stop sending
                </Button>
              </>
            )}
          </div>
        </div>

        {notice && <div className="bg-bcs-green/10 text-bcs-green text-sm rounded-xl px-4 py-3">{notice}</div>}

        {n.status !== "draft" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900">Delivery</span>
              <span className="text-gray-500">
                {done}/{n.total_recipients} processed
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-bcs-green transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div><p className="text-lg font-semibold text-bcs-green">{stats.sent}</p><p className="text-gray-500">Sent</p></div>
              <div><p className="text-lg font-semibold text-blue-700">{stats.sending}</p><p className="text-gray-500">In flight</p></div>
              <div><p className="text-lg font-semibold text-amber-700">{stats.pending}</p><p className="text-gray-500">Waiting</p></div>
              <div><p className="text-lg font-semibold text-red-600">{stats.failed}</p><p className="text-gray-500">Failed</p></div>
            </div>
            {inProgress && (
              <p className="text-xs text-gray-400">
                Sends go out every 15 minutes within the daily limit. This page refreshes automatically.
              </p>
            )}
            {failures.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-red-600">Failed recipients ({failures.length})</summary>
                <ul className="mt-2 space-y-1 text-gray-600">
                  {failures.map((f) => (
                    <li key={f.email}>
                      {f.email} — {f.last_error || "unknown error"} ({f.attempts} attempt{f.attempts === 1 ? "" : "s"})
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <NewsletterComposer key={n.updated_at} newsletter={n} />

        {n.status === "draft" && (
          <p className="text-xs text-gray-400">
            Tip: send yourself a test first — it goes through the same template your subscribers will see.
          </p>
        )}

        <button onClick={() => router.push("/admin/newsletters")} className="text-sm text-gray-500 underline">
          ← All newsletters
        </button>
      </div>
    </AdminLayout>
  );
}
