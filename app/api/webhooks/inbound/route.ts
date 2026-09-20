import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { extractReplyText } from "@/lib/emailReplyText";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Receives visitor replies from the Cloudflare Email Worker.
 * Body: { message_id, from, subject, text, html?, email_message_id? }
 *
 * 200 → stored. Any 4xx → the Worker falls back to forwarding the email
 * to the Gmail inbox, so nothing is lost when a check fails.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const messageId = typeof body?.message_id === "string" ? body.message_id.trim() : "";
  const from = typeof body?.from === "string" ? body.from.trim().toLowerCase() : "";
  const rawText = typeof body?.text === "string" ? body.text : "";
  const emailMessageId = typeof body?.email_message_id === "string" ? body.email_message_id.slice(0, 500) : null;

  if (!UUID_RE.test(messageId) || !from) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: message } = await supabase
    .from("contact_messages")
    .select("id, email")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) {
    return NextResponse.json({ error: "Unknown message" }, { status: 404 });
  }

  // Only the original correspondent may append to their own thread.
  if (message.email.toLowerCase() !== from) {
    return NextResponse.json({ error: "Sender does not match thread" }, { status: 403 });
  }

  const text = extractReplyText(rawText).slice(0, 10000);
  if (!text) {
    return NextResponse.json({ error: "Empty reply" }, { status: 422 });
  }

  const { error } = await supabase.from("contact_replies").insert({
    message_id: messageId,
    body: text,
    direction: "inbound",
    from_email: from,
    email_message_id: emailMessageId,
    sent_by: null,
  });

  if (error) {
    // Duplicate delivery of the same email: treat as success.
    if (error.code === "23505") return NextResponse.json({ success: true, duplicate: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
