import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";

type Props = { params: Promise<{ slug: string }> };

export async function PUT(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const supabase = createServerSupabase();

  try {
    const body = await req.json();
    const { categories, ...eventData } = body; // ⬅️ separate ticket categories

    // ✅ 1. Update the main event by slug
    const { error: eventError, data: event } = await supabase
      .from("events")
      .update(eventData)
      .eq("slug", slug)
      .select("id, slug")
      .single();

    if (eventError) throw eventError;

    // ✅ 2. Update ticket categories in place. Deleting and re-inserting them
    // would leave a moment where the event has no categories to buy.
    if (Array.isArray(categories)) {
      const { data: current, error: currentError } = await supabase
        .from("ticket_categories")
        .select("id, name")
        .eq("event_id", event.id);

      if (currentError) throw currentError;

      const existing: { id: string; name: string }[] = current ?? [];
      const kept = new Set<string>();

      for (const cat of categories) {
        const match = existing.find(
          (c) => !kept.has(c.id) && (c.id === cat.id || c.name === cat.name)
        );
        const values = { name: cat.name, price: cat.price };

        const { error: catError } = match
          ? await supabase.from("ticket_categories").update(values).eq("id", match.id)
          : await supabase.from("ticket_categories").insert({ ...values, event_id: event.id });

        if (catError) throw catError;
        if (match) kept.add(match.id);
      }

      const removed = existing.filter((c) => !kept.has(c.id)).map((c) => c.id);
      if (removed.length > 0) {
        const { error: removeError } = await supabase.from("ticket_categories").delete().in("id", removed);
        if (removeError) throw removeError;
      }
    }

    // ✅ 3. Auto revalidate events page
    revalidatePath("/events");
    revalidatePath("/events/[slug]", "page");

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

export async function DELETE(_req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const supabase = createServerSupabase();

  try {
    // 1. Find event ID and associated documents first
    const { data: event, error: findError } = await supabase
      .from("events")
      .select("id, event_documents(storage_path)")
      .eq("slug", slug)
      .single();

    if (findError || !event) {
      throw new Error("Event not found");
    }

    // 2. Cleanup physical files from Supabase Storage
    // We do this before deleting the DB record so we still have the paths
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storagePaths = event.event_documents?.map((doc: any) => doc.storage_path) || [];
    
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("event-documents")
        .remove(storagePaths);
      
      if (storageError) {
        console.error("Storage Cleanup Error:", storageError.message);
        // We continue anyway, so the DB record doesn't get stuck 
        // due to a minor storage glitch
      }
    }

    // 3. Delete related data and the event
    // Note: ticket_categories doesn't have CASCADE in your current file, 
    // so we delete manually as you did before.
    await supabase.from("ticket_categories").delete().eq("event_id", event.id);
    
    // event_documents will be deleted automatically by DB Cascade 
    // when the event is deleted below:
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", event.id);

    if (deleteError) throw deleteError;

    // Revalidate public events list
    revalidatePath("/events");
    revalidatePath("/events/[slug]", "page");

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
