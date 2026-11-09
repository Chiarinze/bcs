import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { PAYMENT_COLUMNS, settlePayment, type PaymentRow } from "@/lib/payments";

export const maxDuration = 60;

const BATCH = 25;
const TIME_BUDGET_MS = 45_000;
const GIVE_UP_AFTER_MS = 48 * 60 * 60 * 1000;

function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false; // an unset secret must never match
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/**
 * Safety net for a missed webhook, called every 15 minutes by pg_cron (see
 * db/payments.sql). Giving up only stops the checking: if money does arrive
 * later, the webhook still fulfils a failed payment.
 */
export async function POST(req: NextRequest) {
  if (!authorised(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("status", "pending")
    .lt("created_at", new Date(started - 5 * 60 * 1000).toISOString())
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(BATCH);

  if (error) {
    console.error("Reconcile failed:", error.message);
    return NextResponse.json({ error: "Could not load payments" }, { status: 500 });
  }

  let checked = 0;
  for (const row of (data ?? []) as PaymentRow[]) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    try {
      const settled = await settlePayment(supabase, row);
      checked++;
      if (settled.status === "pending" && started - new Date(row.created_at).getTime() > GIVE_UP_AFTER_MS) {
        await supabase.from("payments").update({ status: "failed" }).eq("reference", row.reference).eq("status", "pending");
      }
    } catch (err) {
      console.error(`Reconcile ${row.reference}:`, (err as Error).message);
    }
  }

  return NextResponse.json({ checked });
}
