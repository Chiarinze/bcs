import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// POST: { body } → stores the reply; the DB trigger emails the visitor
// from info@ and marks the message 'replied'.
export async function POST(req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const payload = await req.json().catch(() => ({}));
  const body = typeof payload.body === "string" ? payload.body.replace(/\r\n/g, "\n").trim() : "";

  if (!body) {
    return NextResponse.json({ error: "Reply cannot be empty" }, { status: 400 });
  }
  if (body.length > 10000) {
    return NextResponse.json({ error: "Reply is too long" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: exists } = await supabase
    .from("contact_messages")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!exists) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("contact_replies")
    .insert({ message_id: id, body, sent_by: admin.id })
    .select("id, message_id, body, sent_by, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
