import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

// POST: a member asks to be hidden from / shown in the public directory,
// or cancels a pending request. Admin must approve before anything changes.
// Body: { action: "hide" | "show" | "cancel", note?: string }
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;

  if (!["hide", "show", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("directory_hidden, directory_request")
    .eq("id", auth.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let update: Record<string, unknown>;
  if (action === "cancel") {
    if (!profile.directory_request) {
      return NextResponse.json({ error: "No pending request" }, { status: 400 });
    }
    update = { directory_request: null, directory_request_at: null, directory_request_note: null };
  } else {
    if (profile.directory_request) {
      return NextResponse.json({ error: "You already have a pending request" }, { status: 400 });
    }
    if ((action === "hide") === profile.directory_hidden) {
      return NextResponse.json(
        { error: action === "hide" ? "You are already hidden" : "You are already visible" },
        { status: 400 }
      );
    }
    update = {
      directory_request: action,
      directory_request_at: new Date().toISOString(),
      directory_request_note: note || null,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", auth.id)
    .select("directory_hidden, directory_request, directory_request_at, directory_request_note")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
