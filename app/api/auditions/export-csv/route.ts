import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { AuditionRegistration } from "@/types";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");

  if (!eventId) return NextResponse.json({ error: "Event ID required" }, { status: 400 });

  try {
    const { data, error } = await supabase
      .from("audition_registrations")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const attendees = data as AuditionRegistration[];

    // CSV Headers
    const headers = [
      "First Name", "Last Name", "Email", "Phone", "Address", 
      "DOB", "Type", "Instrument", "Voice Part", 
      "Solfa Score", "Staff Score", "Preferred Time", "Registered At"
    ];

    // CSV Rows
    const rows = attendees.map(a => [
      a.first_name,
      a.last_name,
      a.email,
      a.phone_number,
      `"${a.physical_address.replace(/"/g, '""')}"`, // Escape quotes in address
      a.date_of_birth,
      a.audition_type,
      a.instrument_name || "N/A",
      a.voice_part || "N/A",
      a.tonic_solfa_score,
      a.staff_notation_score,
      a.preferred_time,
      new Date(a.created_at).toLocaleString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audition-attendees.csv"`,
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}