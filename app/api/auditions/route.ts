import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sanitizeSearch } from "@/lib/sanitize";

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

  let body: AuditionBody;
  try {
    body = (await req.json()) as AuditionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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
    photo_url,
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
    !photo_url ||
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