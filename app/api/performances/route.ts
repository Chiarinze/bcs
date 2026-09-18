import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { parsePerformanceInput } from "@/lib/performanceInput";

// Route files may only export handlers, so this stays module-private.
function revalidatePerformancePages() {
  revalidatePath("/");
  revalidatePath("/performances");
}

// GET: all performances (admin list)
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("performances")
    .select("*")
    .order("performed_on", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

// POST: create a performance
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { value, error: validationError } = parsePerformanceInput(body, { requireImage: true });
  if (!value) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("performances")
    .insert(value)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePerformancePages();
  return NextResponse.json(data, { status: 201 });
}
