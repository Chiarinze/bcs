import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

interface Props {
  params: Promise<{ slug: string }>;
}

// GET: check if current user is registered
export async function GET(_req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: registration } = await supabase
    .from("internal_event_registrations")
    .select("id, created_at")
    .eq("event_id", event.id)
    .eq("user_id", auth.id)
    .maybeSingle();

  return NextResponse.json({ registered: !!registration });
}

// POST: register current user for the event
export async function POST(_req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await params;
  const supabase = createServerSupabase();

  // Get event
  const { data: event } = await supabase
    .from("events")
    .select("id, is_internal, registration_closed")
    .eq("slug", slug)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!event.is_internal) {
    return NextResponse.json({ error: "This is not an internal event" }, { status: 400 });
  }

  if (event.registration_closed) {
    return NextResponse.json(
      { error: "Registration is closed for this event." },
      { status: 403 }
    );
  }

  // Get member profile (only select columns that exist in the profiles table)
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, other_name, email, physical_address, ensemble_arm, choir_part, orchestra_instrument, year_inducted, membership_status, photo_url, membership_id")
    .eq("id", auth.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.first_name || !profile.last_name) {
    return NextResponse.json({ error: "Please complete your profile first" }, { status: 400 });
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from("internal_event_registrations")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", auth.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You are already registered for this event" }, { status: 409 });
  }

  // Insert registration with profile data
  const { error } = await supabase
    .from("internal_event_registrations")
    .insert({
      event_id: event.id,
      user_id: auth.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      other_name: profile.other_name || null,
      email: profile.email,
      physical_address: profile.physical_address || "",
      ensemble_arm: profile.ensemble_arm || "",
      choir_part: profile.choir_part || null,
      orchestra_instrument: profile.orchestra_instrument || null,
      join_year: profile.year_inducted || new Date().getFullYear(),
      has_medical_condition: false,
      medical_condition_details: null,
      membership_status: profile.membership_status || "probationary",
      passport_url: profile.photo_url || "",
      membership_id: profile.membership_id || null,
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You are already registered for this event" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
