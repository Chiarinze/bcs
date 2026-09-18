import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { sanitizeSearch } from "@/lib/sanitize";

const PAGE_SIZE = 50;

// GET: email log. ?status=&kind=&q=&page=
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const kind = sanitizeSearch(searchParams.get("kind") || "");
  const q = sanitizeSearch(searchParams.get("q") || "");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createServerSupabase();
  let query = supabase
    .from("email_log")
    .select("id, kind, to_email, from_email, subject, status, status_code, error, meta, created_at, resolved_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status && ["queued", "sent", "failed", "unknown"].includes(status)) query = query.eq("status", status);
  if (kind) query = query.eq("kind", kind);
  if (q) query = query.or(`to_email.ilike.%${q}%,subject.ilike.%${q}%`);

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const [{ data, error, count }, { data: kinds }, { count: today }, { data: settings }] = await Promise.all([
    query,
    supabase.from("email_log").select("kind").order("kind"),
    supabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayStart.toISOString())
      .neq("status", "failed"),
    supabase.from("newsletter_settings").select("daily_cap").eq("id", 1).maybeSingle(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    entries: data || [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    kinds: [...new Set(((kinds || []) as { kind: string }[]).map((k) => k.kind))],
    sentToday: today ?? 0,
    dailyCap: settings?.daily_cap ?? null,
  });
}
