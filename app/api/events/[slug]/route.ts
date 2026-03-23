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
