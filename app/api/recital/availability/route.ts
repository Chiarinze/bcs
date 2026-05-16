import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { createServerSupabase } from "@/lib/supabaseServer";
import { fridaysBetween, parseISODate, toISODate } from "@/lib/recital";

// GET: list every Friday from today to cutoff with remaining slots
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  const { data: cfg } = await supabase
    .from("recital_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (!cfg) {
    return NextResponse.json({ error: "Recital not configured" }, { status: 500 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = parseISODate(cfg.cutoff_date);

  const fridays = fridaysBetween(today, cutoff);

  if (fridays.length === 0) {
    return NextResponse.json({
      cutoff_date: cfg.cutoff_date,
      max_per_day: cfg.max_per_day,
      days: [],
    });
  }

  // Count current scheduled bookings per Friday
  const { data: counts } = await supabase
    .from("recital_bookings")
    .select("recital_date")
    .in("recital_date", fridays);

  const taken = new Map<string, number>();
  for (const row of counts || []) {
    const k = row.recital_date as string;
    taken.set(k, (taken.get(k) || 0) + 1);
  }

  const days = fridays.map((iso) => {
    const used = taken.get(iso) || 0;
    const remaining = Math.max(0, cfg.max_per_day - used);
    return { date: iso, remaining, full: remaining === 0 };
  });

  return NextResponse.json({
    cutoff_date: cfg.cutoff_date,
    max_per_day: cfg.max_per_day,
    today: toISODate(today),
    days,
  });
}
