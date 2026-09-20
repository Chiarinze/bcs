import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// GET: one message with its reply thread
export async function GET(_req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const supabase = createServerSupabase();

  const [{ data: message }, { data: replies }] = await Promise.all([
    supabase
      .from("contact_messages")
      .select("id, name, email, phone, subject, message, status, read_at, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("contact_replies")
      .select("id, message_id, body, direction, from_email, sent_by, created_at, sender:profiles!sent_by(first_name, last_name)")
      .eq("message_id", id)
      .order("created_at"),
  ]);

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Opening a message marks it read (never downgrade 'replied').
  if (message.status === "new") {
    await supabase
      .from("contact_messages")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", id);
    message.status = "read";
  }

  return NextResponse.json({ message, replies: replies || [] });
}

// DELETE: one message (replies cascade)
export async function DELETE(_req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const supabase = createServerSupabase();
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
