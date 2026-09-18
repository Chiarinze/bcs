import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// POST: stop a queued/sending campaign; already-sent copies cannot be recalled.
export async function POST(_req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("newsletters")
    .update({ status: "cancelled", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["queued", "sending"])
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Campaign is not in progress" }, { status: 409 });

  await supabase.from("newsletter_deliveries").delete().eq("newsletter_id", id).eq("status", "pending");

  return NextResponse.json({ success: true });
}
