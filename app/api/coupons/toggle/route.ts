import { NextResponse, NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const { id, is_active } = await req.json();

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("coupon_codes")
    .update({ is_active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Toggle coupon", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
