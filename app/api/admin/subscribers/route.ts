import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { sanitizeSearch } from "@/lib/sanitize";

const PAGE_SIZE = 50;

// GET: ?q=&status=&page=
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const q = sanitizeSearch(searchParams.get("q") || "");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createServerSupabase();
  let query = supabase
    .from("subscribers")
    .select("id, email, name, source, status, consent_at, unsubscribed_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status === "subscribed" || status === "unsubscribed") query = query.eq("status", status);
  if (q) query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%`);

  const [{ data, error, count }, { count: subscribed }, { count: unsubscribed }] = await Promise.all([
    query,
    supabase.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
    supabase.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    subscribers: data || [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    counts: { subscribed: subscribed ?? 0, unsubscribed: unsubscribed ?? 0 },
  });
}

// POST: add one contact manually { email, name }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";

  const supabase = createServerSupabase();
  const { data: id, error } = await supabase.rpc("upsert_subscriber", {
    p_email: email,
    p_name: name || null,
    p_source: "manual",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!id) return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });

  return NextResponse.json({ success: true, id }, { status: 201 });
}

// DELETE: { ids: string[] } — permanently removes contacts
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((i) => typeof i === "string")) {
    return NextResponse.json({ error: "ids[] required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.from("subscribers").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, deleted: ids.length });
}
