import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// POST: queue the campaign for every subscribed contact. The pg_cron job
// drips it out under the daily cap; nothing is sent from here.
export async function POST(_req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: nl } = await supabase.from("newsletters").select("status, body_html").eq("id", id).maybeSingle();
  if (!nl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (nl.status !== "draft") return NextResponse.json({ error: "Only drafts can be sent" }, { status: 409 });
  if (!nl.body_html || nl.body_html.replace(/<[^>]+>/g, "").trim().length < 20) {
    return NextResponse.json({ error: "The newsletter body is empty" }, { status: 400 });
  }

  const { data: count, error } = await supabase.rpc("enqueue_newsletter", { p_newsletter_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, queued: count });
}
