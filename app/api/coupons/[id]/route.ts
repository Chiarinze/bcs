import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

type Props = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await req.json();
    const supabase = createServerSupabase();

    const { error } = await supabase
      .from("coupon_codes")
      .update({ is_active: body.is_active })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("PUT /api/coupons/[id] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase.from("coupon_codes").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("DELETE /api/coupons/[id] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
