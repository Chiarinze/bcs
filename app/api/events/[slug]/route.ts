import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type ParamsType =
  | { params: { slug: string } }
  | { params: Promise<{ slug: string }> };

export async function PUT(req: NextRequest, context: ParamsType) {
  const resolvedParams =
    "then" in context.params
      ? await context.params
      : (context.params as { slug: string });

  const { slug } = resolvedParams;

  try {
    const body = await req.json();
    const { categories, ...eventData } = body; // ⬅️ separate ticket categories

    // ✅ 1. Update the main event by slug
    const { error: eventError, data: event } = await supabase
      .from("events")
      .update(eventData)
      .eq("slug", slug)
      .select("slug")
      .single();

    if (eventError) throw eventError;

    // ✅ 2. Refresh ticket categories
    if (Array.isArray(categories)) {
      // Delete old categories
      await supabase.from("ticket_categories").delete().eq("event_id", event.id);

      // Insert new ones
      const categoryData = categories.map((cat) => ({
        event_id: event.id,
        name: cat.name,
        price: cat.price,
      }));

      const { error: catError } = await supabase
        .from("ticket_categories")
        .insert(categoryData);

      if (catError) throw catError;
    }

    // ✅ 3. Auto revalidate events page
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/events",
        adminKey: process.env.NEXT_PUBLIC_ADMIN_PASS,
      }),
    }).catch(() => null);

    return NextResponse.json(
      { success: true, message: "Event updated successfully" },
      { status: 200 }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("PUT /api/events/[id] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: ParamsType) {
  const resolvedParams =
    "then" in context.params
      ? await context.params
      : (context.params as { slug: string });

  const { slug } = resolvedParams;

  try {
    // ✅ Find event ID first
    const { data: event, error: findError } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .single();

    if (findError || !event) {
      throw new Error("Event not found");
    }

    // Delete categories, then event
    await supabase.from("ticket_categories").delete().eq("event_id", event.id);
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) throw error;

    // Revalidate public events list
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "/events",
        adminKey: process.env.NEXT_PUBLIC_ADMIN_PASS,
      }),
    }).catch(() => null);

    return NextResponse.json(
      { success: true, message: "Event deleted successfully" },
      { status: 200 }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("DELETE /api/events/[id] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
