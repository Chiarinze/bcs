/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic"; // always fetch fresh data

// interface Attendee {
//   buyer_name: string;
//   buyer_email: string;
//   category: string | null;
//   amount_paid: number | null;
//   created_at: string;
// }

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const presenting = searchParams.get("presenting") || "";
  const category = searchParams.get("category") || "";
  const supabase = createServerSupabase();

  const { data: event } = await supabase.from("events").select("is_internal, collect_paper_info").eq("id", event_id).single();

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
    let query = supabase.from("tickets").select("*").eq("event_id", event_id).order("created_at");
    if (category.trim()) query = query.eq("category", category.trim());
    if (presenting === "yes") query = query.eq("presenting_paper", true);
    else if (presenting === "no") query = query.eq("presenting_paper", false);
    const { data } = await query;

    const collectPaper = event?.collect_paper_info === true;
    headers = ["Name", "Email", "Category", "Amount", "Reference", "Registered"];
    if (collectPaper) headers.push("Affiliation", "Presenting paper", "Paper title");
    rows = (data || []).map((a: any) => {
      const row = [a.buyer_name, a.buyer_email, a.category, a.amount_paid, a.payment_ref, a.created_at];
      if (collectPaper) row.push(a.affiliation || "", a.presenting_paper === true ? "Yes" : a.presenting_paper === false ? "No" : "", a.paper_title || "");
      return row;
    });
  }

  const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="export.csv"` }
  });
}
