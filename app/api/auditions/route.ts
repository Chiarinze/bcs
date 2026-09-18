import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sanitizeSearch } from "@/lib/sanitize";
import { detectImageType } from "@/lib/detectImageType";

interface AuditionBody {
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  physical_address: string;
  date_of_birth: string;
  audition_type: "voice" | "instrument";
  instrument_name?: string | null;
  voice_part?: string | null;
  tonic_solfa_score: number;
  staff_notation_score: number;
  photo_url: string;
  preferred_time: string;
  attestation: boolean;
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(getClientIp(req.headers), {
    key: "audition-register",
    limit: 5,
    windowSeconds: 60,
  });
  if (limited) return limited;

  // Multipart: all the text fields plus the applicant's photo. The photo is
  // only written to storage after the whole registration validates.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const num = (k: string) => Number(str(k));

  const body: Omit<AuditionBody, "photo_url"> = {
    event_id: str("event_id"),
    first_name: str("first_name"),
    last_name: str("last_name"),
    email: str("email"),
    phone_number: str("phone_number"),
    physical_address: str("physical_address"),
    date_of_birth: str("date_of_birth"),
    audition_type: str("audition_type") as "voice" | "instrument",
    instrument_name: str("instrument_name") || null,
    voice_part: str("voice_part") || null,
    tonic_solfa_score: num("tonic_solfa_score"),
    staff_notation_score: num("staff_notation_score"),
    preferred_time: str("preferred_time"),
    attestation: str("attestation") === "true",
  };
  const photo = form.get("photo") as File | null;

  const {
    event_id,
    first_name,
    last_name,
    email,
    phone_number,
    physical_address,
    date_of_birth,
    audition_type,
    instrument_name,
    voice_part,
    tonic_solfa_score,
    staff_notation_score,
    preferred_time,
    attestation,
  } = body;

  if (
    !event_id ||
    !first_name ||
    !last_name ||
    !email ||
    !phone_number ||
    !physical_address ||
    !date_of_birth ||
    !audition_type ||
    !photo ||
    photo.size === 0 ||
    !preferred_time ||
    !attestation
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (audition_type !== "voice" && audition_type !== "instrument") {
    return NextResponse.json(
      { error: "Invalid audition type" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  // Check event exists and that registration isn't closed
  const { data: event } = await supabase
    .from("events")
    .select("id, event_type, registration_closed")
    .eq("id", event_id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.event_type !== "audition") {
    return NextResponse.json(
      { error: "This is not an audition event" },
      { status: 400 }
    );
  }

  if (event.registration_closed) {
    return NextResponse.json(
      { error: "Registration is closed for this audition." },
      { status: 403 }
    );
  }

  // Photo: ≤2MB, real image bytes. Stored under passports/auditions/<event>/.
  if (photo.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo must be under 2MB" }, { status: 400 });
  }
  const photoBuffer = Buffer.from(await photo.arrayBuffer());
  const photoType = detectImageType(photoBuffer);
  if (!photoType || photoType.ext === "gif") {
    return NextResponse.json({ error: "Photo must be a PNG, JPEG or WebP image" }, { status: 400 });
  }

  const photoPath = `auditions/${event.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${photoType.ext}`;
  const { error: uploadError } = await supabase.storage
    .from("passports")
    .upload(photoPath, photoBuffer, { contentType: photoType.mime });
  if (uploadError) {
    return NextResponse.json({ error: "Photo upload failed" }, { status: 500 });
  }
  const photo_url = supabase.storage.from("passports").getPublicUrl(photoPath).data.publicUrl;

  const { error } = await supabase.from("audition_registrations").insert({
    event_id,
    first_name,
    last_name,
    email,
    phone_number,
    physical_address,
    date_of_birth,
    audition_type,
    instrument_name: audition_type === "instrument" ? instrument_name ?? null : null,
    voice_part: audition_type === "voice" ? voice_part ?? null : null,
    tonic_solfa_score,
    staff_notation_score,
    photo_url,
    preferred_time,
    attestation,
  });

  if (error) {
    await supabase.storage.from("passports").remove([photoPath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  
  const eventId = searchParams.get("event_id");
  const rawSearch = searchParams.get("search") || "";

  if (!eventId) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  try {
    let query = supabase
      .from("audition_registrations")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    const search = sanitizeSearch(rawSearch);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || [], { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("GET /api/auditions error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}