import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AuditionRegistration } from "@/types"; // Import the type

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");

  if (!eventId) return NextResponse.json({ error: "Event ID required" }, { status: 400 });

  try {
    const { data: event } = await supabase.from("events").select("title").eq("id", eventId).single();
    const { data: attendees, error } = await supabase
      .from("audition_registrations")
      .select("*")
      .eq("event_id", eventId);

    if (error) throw error;

    const doc = new jsPDF();
    doc.text(`Audition Candidates: ${event?.title || "Event"}`, 14, 15);

    // Explicitly type 'a' as AuditionRegistration to fix the TS error
    const tableRows = (attendees as AuditionRegistration[] || []).map((a: AuditionRegistration) => [
      `${a.first_name} ${a.last_name}`,
      a.email,
      a.audition_type === 'voice' ? (a.voice_part || "N/A") : (a.instrument_name || "N/A"),
      `${a.tonic_solfa_score}/10`,
      `${a.staff_notation_score}/10`,
      a.preferred_time
    ]);

    autoTable(doc, {
      startY: 20,
      head: [["Name", "Email", "Part/Inst", "Solfa", "Staff", "Time"]],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [21, 94, 117] } 
    });

    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="audition-list.pdf"`,
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}