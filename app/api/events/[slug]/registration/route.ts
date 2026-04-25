import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";

interface Props {
  params: Promise<{ slug: string }>;
}

// POST: open or close registration for an event (admin only)
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const closed = Boolean(body?.closed);

  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("events")
    .update({ registration_closed: closed })
    .eq("id", event.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/events");
  revalidatePath(`/events/${slug}`);

  return NextResponse.json({ success: true, registration_closed: closed });
}
