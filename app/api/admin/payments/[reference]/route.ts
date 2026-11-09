import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { PAYMENT_COLUMNS, settlePayment, type PaymentRow } from "@/lib/payments";

type Props = { params: Promise<{ reference: string }> };

/**
 * recheck  — ask Paystack again and complete the payment if it is paid.
 * complete — same, but accept a different amount. Paystack must still report
 *            the payment as successful: an admin cannot mark unpaid orders paid.
 * dismiss  — close a review item that needs no further action.
 */
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { reference } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

  try {
    const supabase = createServerSupabase();

    if (action === "dismiss") {
      const { error } = await supabase
        .from("payments")
        .update({ status: "dismissed" })
        .eq("reference", reference)
        .eq("status", "needs_review");
      if (error) throw error;
      return NextResponse.json({ status: "dismissed" });
    }

    if (action !== "recheck" && action !== "complete") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data } = await supabase.from("payments").select(PAYMENT_COLUMNS).eq("reference", reference).maybeSingle();
    if (!data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const settled = await settlePayment(supabase, data as PaymentRow, action === "complete");
    return NextResponse.json({ status: settled.status, gateway: settled.gateway_status });
  } catch (error) {
    console.error("Admin payment action error:", (error as Error).message);
    return NextResponse.json({ error: "Could not update this payment" }, { status: 500 });
  }
}
