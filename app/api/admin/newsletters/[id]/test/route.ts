import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

interface Props {
  params: Promise<{ id: string }>;
}

// POST: send a single test copy to the logged-in admin's email.
export async function POST(_req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  if (!admin.email) return NextResponse.json({ error: "Your account has no email" }, { status: 400 });

  const supabase = createServerSupabase();
  const { error } = await supabase.rpc("send_newsletter_test", { p_newsletter_id: id, p_to: admin.email });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, to: admin.email });
}
