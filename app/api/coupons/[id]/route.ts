import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

type Props = { params: Promise<{ id: string }> };

/**
 * Body: { is_active?: boolean, usage_limit?: number | null }.
 * usage_limit null means unlimited. A limit at or below the uses so far
 * stops the code working; raising it makes it work again.
 */
export async function PUT(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const update: { is_active?: boolean; usage_limit?: number | null } = {};

  if (typeof body?.is_active === "boolean") update.is_active = body.is_active;

  if (body && "usage_limit" in body) {
    const limit = body.usage_limit === null || body.usage_limit === "" ? null : Number(body.usage_limit);
    if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 1_000_000)) {
      return NextResponse.json({ error: "Max uses must be a whole number of at least 1, or blank for unlimited" }, { status: 400 });
    }
    update.usage_limit = limit;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("coupon_codes")
      .update(update)
      .eq("id", id)
      .select("id, is_active, usage_limit, usage_count")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });

    return NextResponse.json({ success: true, coupon: data });
  } catch (error) {
    console.error("PUT /api/coupons/[id] error:", (error as Error).message);
    return NextResponse.json({ error: "Could not update the coupon" }, { status: 500 });
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
  } catch (error) {
    console.error("DELETE /api/coupons/[id] error:", (error as Error).message);
    return NextResponse.json({ error: "Could not delete the coupon" }, { status: 500 });
  }
}
