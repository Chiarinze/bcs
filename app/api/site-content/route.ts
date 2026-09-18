import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { DEFAULT_ABOUT, DEFAULT_CONTACT } from "@/lib/siteContent";
import type { AboutContent, ContactContent, SiteContentKey } from "@/types";

const MAX_TEXT = 2000;
const MAX_LIST = 30;

function str(v: unknown, max = MAX_TEXT): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function strList(v: unknown, max = 200): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => str(item, max))
    .filter(Boolean)
    .slice(0, MAX_LIST);
}

function url(v: unknown): string {
  const s = str(v, 500);
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : "";
}

/** Whitelists and normalises every field so arbitrary JSON can never be stored. */
function sanitizeAbout(body: Record<string, unknown>): AboutContent {
  return {
    tagline: str(body.tagline, 300),
    home_intro: str(body.home_intro),
    intro: strList(body.intro, MAX_TEXT),
    mission: str(body.mission),
    vision: str(body.vision),
    what_we_do: (Array.isArray(body.what_we_do) ? body.what_we_do : [])
      .map((item) => {
        const o = (item ?? {}) as Record<string, unknown>;
        return { title: str(o.title, 120), description: str(o.description, 500) };
      })
      .filter((item) => item.title)
      .slice(0, MAX_LIST),
    repertoire_intro: str(body.repertoire_intro, 300),
    repertoire: strList(body.repertoire, 60),
    services: str(body.services),
    join_us: str(body.join_us),
    arms: strList(body.arms, 120),
    management_units: strList(body.management_units, 120),
  };
}

function sanitizeContact(body: Record<string, unknown>): ContactContent {
  return {
    tagline: str(body.tagline, 300),
    phone: str(body.phone, 40),
    email: str(body.email, 120),
    facebook: url(body.facebook),
    instagram: url(body.instagram),
    description: str(body.description),
    digital_services_intro: str(body.digital_services_intro, 300),
    digital_services: strList(body.digital_services, 80),
  };
}

const KEYS: SiteContentKey[] = ["about", "contact"];

// GET: both documents for the admin editor
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("site_content")
    .select("key, value, updated_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byKey = Object.fromEntries(
    ((data || []) as { key: string; value: Record<string, unknown> }[]).map((r) => [r.key, r.value])
  );
  return NextResponse.json({
    about: { ...DEFAULT_ABOUT, ...(byKey.about ?? {}) },
    contact: { ...DEFAULT_CONTACT, ...(byKey.contact ?? {}) },
  });
}

// PUT: replace one document { key, value }
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => null);
  const key = body?.key as SiteContentKey;
  const raw = body?.value;

  if (!KEYS.includes(key) || !raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const value = key === "about" ? sanitizeAbout(raw) : sanitizeContact(raw);

  const supabase = createServerSupabase();
  const { error } = await supabase.from("site_content").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Public pages are ISR-cached; drop the stale copies now.
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");

  return NextResponse.json({ success: true, value });
}
