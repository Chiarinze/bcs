import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { requireAuth } from "@/lib/requireAuth";
import { detectImageType } from "@/lib/detectImageType";
import { detectDocumentType } from "@/lib/detectDocumentType";

/**
 * Single server-side upload endpoint. The browser never writes to storage
 * directly, so bucket INSERT policies can stay closed.
 *
 * multipart: { purpose, file, event_id? }
 *   event-image     admin  → event-images/<ts>-<rand>.<ext>        (≤5MB, image)
 *   event-document  admin  → event-documents/<event_id>/<ts>.<ext>  (≤10MB, pdf/office/image)
 *   passport        member → passports/<uid>.<ext>                 (≤2MB, image; replaces previous)
 */
const MB = 1024 * 1024;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const purpose = formData.get("purpose");
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (purpose === "event-image") {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;
    if (file.size > 5 * MB) return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });

    const type = detectImageType(buffer);
    if (!type) return NextResponse.json({ error: "File must be a PNG, JPEG, WebP or GIF image" }, { status: 400 });

    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${type.ext}`;
    const { error } = await supabase.storage.from("event-images").upload(path, buffer, { contentType: type.mime });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ url: supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl, path });
  }

  if (purpose === "event-document") {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;
    if (file.size > 10 * MB) return NextResponse.json({ error: "Document must be under 10MB" }, { status: 400 });

    const eventId = formData.get("event_id");
    if (typeof eventId !== "string" || !/^[0-9a-f-]{36}$/i.test(eventId)) {
      return NextResponse.json({ error: "event_id required" }, { status: 400 });
    }
    const type = detectDocumentType(buffer, file.name);
    if (!type) return NextResponse.json({ error: "File must be a PDF, Word/Excel/PowerPoint document, or image" }, { status: 400 });

    const path = `${eventId}/${Date.now()}.${type.ext}`;
    const { error } = await supabase.storage.from("event-documents").upload(path, buffer, { contentType: type.mime });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ url: supabase.storage.from("event-documents").getPublicUrl(path).data.publicUrl, path });
  }

  if (purpose === "passport") {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    if (file.size > 2 * MB) return NextResponse.json({ error: "Photo must be under 2MB" }, { status: 400 });

    const type = detectImageType(buffer);
    if (!type || type.ext === "gif") return NextResponse.json({ error: "Photo must be a PNG, JPEG or WebP image" }, { status: 400 });

    // One file per member; a re-upload replaces it. The extension may change,
    // so remove any previous variants first.
    const bucket = supabase.storage.from("passports");
    const { data: existing } = await bucket.list("", { search: auth.id });
    const stale = ((existing || []) as { name: string }[]).map((f) => f.name).filter((n) => n.startsWith(`${auth.id}.`));
    if (stale.length) await bucket.remove(stale);

    const path = `${auth.id}.${type.ext}`;
    const { error } = await bucket.upload(path, buffer, { contentType: type.mime, upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Cache-bust so the new photo shows immediately in <img> tags.
    const url = `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    return NextResponse.json({ url, path });
  }

  return NextResponse.json({ error: "Unknown upload purpose" }, { status: 400 });
}
