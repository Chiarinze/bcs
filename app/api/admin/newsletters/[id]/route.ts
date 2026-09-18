import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseNewsletterInput } from "@/lib/newsletterInput";

interface Props {
  params: Promise<{ id: string }>;
}

// GET: one campaign with delivery stats
export async function GET(_req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: newsletter } = await supabase.from("newsletters").select("*").eq("id", id).maybeSingle();
  if (!newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: deliveries } = await supabase
    .from("newsletter_deliveries")
    .select("status")
    .eq("newsletter_id", id);

  const stats = { pending: 0, sending: 0, sent: 0, failed: 0 };
  for (const d of (deliveries || []) as { status: keyof typeof stats }[]) stats[d.status]++;

  const { data: failures } = await supabase
    .from("newsletter_deliveries")
    .select("email, last_error, attempts")
    .eq("newsletter_id", id)
    .eq("status", "failed")
    .limit(50);

  return NextResponse.json({ newsletter, stats, failures: failures || [] });
}

// PUT: edit a draft
export async function PUT(req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { value, error: validationError } = parseNewsletterInput(body);
  if (!value) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("newsletters")
    .update({ ...value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft")
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Only drafts can be edited" }, { status: 409 });
  return NextResponse.json(data);
}

// DELETE: remove a campaign that is not mid-send
export async function DELETE(_req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("newsletters")
    .delete()
    .eq("id", id)
    .in("status", ["draft", "sent", "cancelled"])
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Cancel the campaign before deleting it" }, { status: 409 });
  return NextResponse.json({ success: true });
}
