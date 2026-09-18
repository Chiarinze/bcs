import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { parsePerformanceInput } from "@/lib/performanceInput";

interface Props {
  params: Promise<{ id: string }>;
}

const BUCKET = "performance-images";

function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/performances");
}

// PUT: update a performance
export async function PUT(req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { value, error: validationError } = parsePerformanceInput(body, { requireImage: false });
  if (!value) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: existing } = await supabase
    .from("performances")
    .select("image_url")
    .eq("id", id)
    .single();
  if (!existing) {
    return NextResponse.json({ error: "Performance not found" }, { status: 404 });
  }

  // Keep the current image (and its blur) when the form did not upload a new one.
  const { image_url, image_blur_data, ...rest } = value;
  const update = image_url
    ? { ...rest, image_url, image_blur_data }
    : rest;

  const { data, error } = await supabase
    .from("performances")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remove the replaced image so the bucket does not accumulate orphans.
  if (value.image_url && value.image_url !== existing.image_url) {
    const oldPath = storagePathFromUrl(existing.image_url);
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
  }

  revalidate();
  return NextResponse.json(data);
}

// DELETE: remove a performance and its image
export async function DELETE(_req: NextRequest, { params }: Props) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: existing } = await supabase
    .from("performances")
    .select("image_url")
    .eq("id", id)
    .single();
  if (!existing) {
    return NextResponse.json({ error: "Performance not found" }, { status: 404 });
  }

  const { error } = await supabase.from("performances").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const path = storagePathFromUrl(existing.image_url);
  if (path) await supabase.storage.from(BUCKET).remove([path]);

  revalidate();
  return NextResponse.json({ success: true });
}
