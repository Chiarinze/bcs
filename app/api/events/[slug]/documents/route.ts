import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  const supabase = createServerSupabase();
  const { slug } = await params; // 👈 Await the params here
  
  // Get event ID first
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: documents, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(documents);
}

export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  // Technically you might not need slug here since you pass event_id in body,
  // but we await it to keep the Route Handler signature valid.
  await params; 

  const body = await req.json();
  const { name, file_url, storage_path, event_id } = body;

  const { data, error } = await supabase
    .from("event_documents")
    .insert([{ name, file_url, storage_path, event_id }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("id");

  if (!docId) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  try {
    const { data: doc, error: fetchError } = await supabase
      .from("event_documents")
      .select("storage_path")
      .eq("id", docId)
      .single();

    if (fetchError || !doc) throw new Error("Document not found");

    const { error: storageError } = await supabase.storage
      .from("event-documents")
      .remove([doc.storage_path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from("event_documents")
      .delete()
      .eq("id", docId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: "Document deleted" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}