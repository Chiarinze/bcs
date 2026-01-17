import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { createServerSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("GET /api/events error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const body = await req.json();

  const {
    categories,
    is_internal,
    access_code,
    event_type,
    audition_slots,
    ...eventData
  } = body;

  const insertData = {
    ...eventData,
    event_type: event_type || "standard",
    is_internal: event_type === "internal" || is_internal || false,
    access_code: event_type === "internal" || is_internal ? access_code : null,
  };

  const { data: event, error } = await supabase
    .from("events")
    .insert([insertData])
    .select()
    .single();

  if (error)
    return NextResponse.json({ message: error.message }, { status: 400 });

  // If Audition, we treat time slots like "Categories" for the admin to define
  if (event_type === "audition" && audition_slots) {
    const slotRecords = audition_slots.map((slot: string) => ({
      event_id: event.id,
      name: slot, // e.g., "10:00 AM - 10:30 AM"
      price: 0,
    }));
    await supabase.from("ticket_categories").insert(slotRecords);
  } else if (categories && categories.length > 0) {
    // Standard ticket logic...
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryRecords = categories.map((cat: any) => ({
      event_id: event.id,
      name: cat.name,
      price: cat.price,
    }));
    await supabase.from("ticket_categories").insert(categoryRecords);
  }

  revalidatePath("/events");
  return NextResponse.json({ success: true, event });
}
