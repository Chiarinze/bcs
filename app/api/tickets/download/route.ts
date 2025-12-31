/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { Readable } from "stream";

// interface Attendee {
//   buyer_name: string;
//   buyer_email: string;
//   category: string;
//   amount_paid: number;
// }

// interface EventRecord {
//   title: string;
// }

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id");
    const supabase = createServerSupabase();

    if (!event_id) return NextResponse.json({ error: "Missing event_id" }, { status: 400 });

    // 1. Get Event Type
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("title, is_internal")
      .eq("id", event_id)
      .single();

    if (eventError || !event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attendeeData: any[] = [];

    // 2. Fetch Data based on type
    if (event.is_internal) {
      const { data } = await supabase
        .from("internal_event_registrations")
        .select("first_name, last_name, email, ensemble_arm, join_year")
        .eq("event_id", event_id)
        .order("last_name", { ascending: true });
      attendeeData = data || [];
    } else {
      const { data } = await supabase
        .from("tickets")
        .select("buyer_name, buyer_email, category, amount_paid")
        .eq("event_id", event_id)
        .order("buyer_name", { ascending: true });
      attendeeData = data || [];
    }

    if (!attendeeData.length) return NextResponse.json({ error: "No attendees found" }, { status: 404 });

    // 3. Generate PDF
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = Readable.from(doc as unknown as Iterable<Buffer>);

    // Title
    doc.font("Times-Bold").fontSize(18).text(`${event.title} - Registered List`, { align: "center" });
    doc.moveDown();

    const tableTop = 100;
    doc.fontSize(10).font("Times-Bold");

    if (event.is_internal) {
      // Internal Headers
      doc.text("Name", 50, tableTop);
      doc.text("Email", 200, tableTop);
      doc.text("Arm", 380, tableTop);
      doc.text("Year", 500, tableTop);
    } else {
      // Public Headers
      doc.text("Name", 50, tableTop);
      doc.text("Email", 200, tableTop);
      doc.text("Category", 380, tableTop);
      doc.text("Amount", 500, tableTop);
    }

    let y = tableTop + 20;
    doc.font("Times-Roman").fontSize(9);

    attendeeData.forEach((a, i) => {
      if (y > 750) { doc.addPage(); y = 50; }
      
      const name = event.is_internal ? `${a.first_name} ${a.last_name}` : a.buyer_name;
      const email = event.is_internal ? a.email : a.buyer_email;
      const col3 = event.is_internal ? a.ensemble_arm : a.category;
      const col4 = event.is_internal ? a.join_year : `N${a.amount_paid}`;

      doc.text(name || "-", 50, y);
      doc.text(email || "-", 200, y, { width: 170 });
      doc.text(col3 || "-", 380, y);
      doc.text(String(col4 || "-"), 500, y);
      y += 20;
    });

    doc.end();
    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attendees.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
