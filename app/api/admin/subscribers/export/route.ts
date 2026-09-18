import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

function csvField(v: string | null): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET: download the whole list as CSV
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("subscribers")
    .select("email, name, source, status, consent_at, unsubscribed_at")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lines = ["email,name,source,status,consent_at,unsubscribed_at"];
  for (const r of data || []) {
    lines.push([r.email, r.name, r.source, r.status, r.consent_at, r.unsubscribed_at].map(csvField).join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
