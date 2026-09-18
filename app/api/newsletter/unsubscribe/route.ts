import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readToken(req: NextRequest): Promise<string | null> {
  // Mail clients' one-click unsubscribe POSTs a form body to the URL in
  // List-Unsubscribe; our page POSTs JSON. Accept both, plus ?token=.
  const fromQuery = new URL(req.url).searchParams.get("token");
  if (fromQuery) return fromQuery;

  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await req.json();
      return typeof body?.token === "string" ? body.token : null;
    }
    const form = await req.formData();
    const t = form.get("token");
    return typeof t === "string" ? t : null;
  } catch {
    return null;
  }
}

// POST: unsubscribe by token. Idempotent.
export async function POST(req: NextRequest) {
  const token = await readToken(req);
  if (!token || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 404 });

  return NextResponse.json({ success: true });
}

// PUT: re-subscribe (from the same page, if they change their mind)
export async function PUT(req: NextRequest) {
  const token = await readToken(req);
  if (!token || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("subscribers")
    .update({ status: "subscribed", unsubscribed_at: null, consent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  return NextResponse.json({ success: true });
}
