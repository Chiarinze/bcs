import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { detectImageType } from "@/lib/detectImageType";

const BUCKET = "performance-images";

// POST: multipart { file } → { url }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "File must be a valid PNG, JPEG, WebP, or GIF image" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${detected.ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: detected.mime });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return NextResponse.json({ url: data.publicUrl });
}
