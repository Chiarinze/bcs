import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

const PAGE_SIZE = 50;

// GET: inbox listing. ?status=new|read|replied  ?page=1
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createServerSupabase();
  let query = supabase
    .from("contact_messages")
    .select("id, name, email, phone, subject, message, status, read_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status && ["new", "read", "replied"].includes(status)) {
    query = query.eq("status", status);
  }

  const [{ data, error, count }, { count: unread }] = await Promise.all([
    query,
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: data || [],
    total: count ?? 0,
    unread: unread ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}

// DELETE: body { ids: string[] } or { all: true }
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const supabase = createServerSupabase();

  if (body?.all === true) {
    const { error } = await supabase
      .from("contact_messages")
      .delete()
      .not("id", "is", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "ids[] or all:true required" }, { status: 400 });
  }

  const { error } = await supabase.from("contact_messages").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, deleted: ids.length });
}
