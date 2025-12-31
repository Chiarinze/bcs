/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic"; // always fetch fresh data

// interface Attendee {
//   buyer_name: string;
//   buyer_email: string;
//   category: string | null;
//   amount_paid: number | null;
//   created_at: string;
// }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const supabase = createServerSupabase();

  const { data: event } = await supabase.from("events").select("is_internal").eq("id", event_id).single();

  let headers: string[] = [];
  let rows: any[] = [];

  if (event?.is_internal) {
    const { data } = await supabase.from("internal_event_registrations").select("*").eq("event_id", event_id);
    headers = ["First Name", "Last Name", "Email", "Arm", "Part", "Year", "Medical"];
    rows = (data || []).map((a: { first_name: any; last_name: any; email: any; ensemble_arm: any; choir_part: any; orchestra_instrument: any; join_year: any; has_medical_condition: any; }) => [
      a.first_name, a.last_name, a.email, a.ensemble_arm, 
      a.choir_part || a.orchestra_instrument, a.join_year, a.has_medical_condition ? "Yes" : "No"
    ]);
  } else {
    const { data } = await supabase.from("tickets").select("*").eq("event_id", event_id);
    headers = ["Name", "Email", "Category", "Amount"];
    rows = (data || []).map((a: { buyer_name: any; buyer_email: any; category: any; amount_paid: any; }) => [a.buyer_name, a.buyer_email, a.category, a.amount_paid]);
  }

  const csv = [headers, ...rows].map(r => r.map((c: any) => `"${c}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="export.csv"` }
  });
}
