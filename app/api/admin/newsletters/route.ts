import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseNewsletterInput, parseRecipientIds } from "@/lib/newsletterInput";

// GET: all campaigns, newest first (bodies omitted)
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const supabase = createServerSupabase();
  const [{ data, error }, { count: subscribed }] = await Promise.all([
    supabase
      .from("newsletters")
      .select("id, subject, preheader, kind, audience, status, total_recipients, sent_count, failed_count, queued_at, completed_at, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ newsletters: data || [], subscribed: subscribed ?? 0 });
}

// POST: create a draft
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { value, error: validationError } = parseNewsletterInput(body);
  if (!value) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("newsletters")
    .insert({ ...value, created_by: admin.id })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (value.audience === "selected") {
    const ids = parseRecipientIds(body.recipient_ids);
    await supabase
      .from("newsletter_recipients")
      .insert(ids.map((subscriber_id) => ({ newsletter_id: data.id, subscriber_id })));
  }

  return NextResponse.json(data, { status: 201 });
}
