// app/api/tickets/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

interface CreateTicketBody {
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  amount_paid: number;
  seller?: string;
  payment_ref: string;
  coupon_code?: string | null;
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();

  try {
    const body: CreateTicketBody = await req.json();
    const {
      event_id,
      buyer_name,
      buyer_email,
      amount_paid,
      seller,
      payment_ref,
      coupon_code,
    } = body;

    if (
      !event_id ||
      !buyer_name ||
      !buyer_email ||
      !payment_ref ||
      !amount_paid
    )
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack secret not configured");

    // Verify Paystack payment
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        payment_ref
      )}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const verifyJson = await verifyRes.json();
    if (!verifyJson?.data?.status || verifyJson.data.status !== "success")
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );

    // Coupon validation
    let coupon;
    if (coupon_code) {
      const { data } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", String(coupon_code).toUpperCase())
        .maybeSingle();

      if (!data || !data.is_active)
        return NextResponse.json(
          { error: "Invalid or inactive coupon" },
          { status: 400 }
        );

      if (data.usage_limit !== null && data.usage_count >= data.usage_limit)
        return NextResponse.json(
          { error: "Coupon usage limit reached" },
          { status: 400 }
        );

      coupon = data;
    }

    // Insert ticket
    const { data: ticket, error: insertError } = await supabase
      .from("tickets")
      .insert([
        {
          event_id,
          buyer_name,
          buyer_email,
          amount_paid,
          seller: seller ?? null,
          payment_ref,
          coupon_code: coupon_code ?? null,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // Increment coupon usage
    if (coupon && coupon_code) {
      await supabase
        .from("coupons")
        .update({ usage_count: coupon.usage_count + 1 })
        .eq("code", coupon_code.toUpperCase());
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    console.error("POST /api/tickets", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(title), coupons(code)")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
