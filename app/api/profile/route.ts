import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createClient as createAuthClient } from "@/lib/supabase/server";

const ALLOWED_ENSEMBLE_ARMS = new Set([
  "choir",
  "orchestra",
  "choir_orchestra",
  "choir_band",
  "orchestra_band",
  "choir_orchestra_band",
]);

const ALLOWED_CHOIR_PARTS = new Set(["Soprano", "Alto", "Tenor", "Bass"]);

const ALLOWED_ORCHESTRA_INSTRUMENTS = new Set([
  "Violin",
  "Viola",
  "Cello",
  "Double Bass",
  "Flute",
  "Oboe",
  "Clarinet",
  "Bassoon",
  "French Horn",
  "Trumpet",
  "Trombone",
  "Tuba",
  "Percussion",
  "Piano",
  "Harp",
]);

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function PATCH(req: NextRequest) {
  // Authenticate using the caller's session — do NOT use the service-role client for auth
  const authClient = await createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Whitelist: only the columns a user may edit on their own profile.
  // Anything outside this list (role, is_verified, membership_id, membership_status,
  // year_inducted, closed_at, email, …) is silently ignored.
  const update: Record<string, unknown> = {};

  if ("first_name" in body) {
    const v = trimOrNull(body.first_name);
    if (!v) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }
    update.first_name = v;
  }

  if ("last_name" in body) {
    const v = trimOrNull(body.last_name);
    if (!v) {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 }
      );
    }
    update.last_name = v;
  }

  if ("other_name" in body) {
    update.other_name = trimOrNull(body.other_name);
  }

  if ("date_of_birth" in body) {
    const v = trimOrNull(body.date_of_birth);
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return NextResponse.json(
        { error: "Invalid date_of_birth (expected YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    update.date_of_birth = v;
  }

  if ("physical_address" in body) {
    update.physical_address = trimOrNull(body.physical_address);
  }

  if ("ensemble_arm" in body) {
    const v = body.ensemble_arm;
    if (v !== null && (typeof v !== "string" || !ALLOWED_ENSEMBLE_ARMS.has(v))) {
      return NextResponse.json(
        { error: "Invalid ensemble_arm" },
        { status: 400 }
      );
    }
    update.ensemble_arm = v;
  }

  if ("choir_part" in body) {
    const v = body.choir_part;
    if (v !== null && (typeof v !== "string" || !ALLOWED_CHOIR_PARTS.has(v))) {
      return NextResponse.json(
        { error: "Invalid choir_part" },
        { status: 400 }
      );
    }
    update.choir_part = v;
  }

  if ("orchestra_instrument" in body) {
    const v = body.orchestra_instrument;
    if (
      v !== null &&
      (typeof v !== "string" || !ALLOWED_ORCHESTRA_INSTRUMENTS.has(v))
    ) {
      return NextResponse.json(
        { error: "Invalid orchestra_instrument" },
        { status: 400 }
      );
    }
    update.orchestra_instrument = v;
  }

  if ("photo_url" in body) {
    const v = body.photo_url;
    if (v !== null && typeof v !== "string") {
      return NextResponse.json({ error: "Invalid photo_url" }, { status: 400 });
    }
    if (typeof v === "string" && v.length) {
      // Only accept URLs hosted by our Supabase storage.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const expectedPrefix = supabaseUrl + "/storage/v1/object/public/passports/";
      if (!v.startsWith(expectedPrefix)) {
        return NextResponse.json(
          { error: "photo_url must be a passports bucket URL" },
          { status: 400 }
        );
      }
    }
    update.photo_url = v;
  }

  if (body.profile_completed === true) {
    update.profile_completed = true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No editable fields supplied" },
      { status: 400 }
    );
  }

  const service = createServerSupabase();
  const { data, error } = await service
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
