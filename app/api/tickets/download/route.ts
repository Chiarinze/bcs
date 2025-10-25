import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { Readable } from "stream";

interface Attendee {
  buyer_name: string;
  buyer_email: string;
  category: string;
  amount_paid: number;
}

interface EventRecord {
  title: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id");

    if (!event_id) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("title")
      .eq("id", event_id)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventData as EventRecord;

    const { data: attendeeData, error } = await supabase
      .from("tickets")
      .select("buyer_name, buyer_email, category, amount_paid")
      .eq("event_id", event_id)
      .order("buyer_name", { ascending: true });

    if (error) throw error;
    if (!attendeeData?.length) {
      return NextResponse.json(
        { error: "No attendees found" },
        { status: 404 }
      );
    }

    // ✅ Generate PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = Readable.from(doc as unknown as Iterable<Buffer>);

    const tableTop = 120;
    const rowHeight = 25;
    const columnPositions = {
      name: 50,
      email: 200,
      category: 400,
      amount: 500,
    };

    // Header
    doc.font("Times-Bold").fontSize(18).text(`Attendee List — ${event.title}`, {
      align: "center",
    });
    doc.moveDown(1);

    // Draw table headers background
    doc
      .rect(45, tableTop - 5, 510, 25)
      .fill("#f0f0f0")
      .stroke();
    doc.fillColor("#000").fontSize(12).font("Times-Bold");

    doc.text("Name", columnPositions.name, tableTop);
    doc.text("Email", columnPositions.email, tableTop);
    doc.text("Category", columnPositions.category, tableTop);
    doc.text("Amount", columnPositions.amount, tableTop, { align: "right" });

    let y = tableTop + rowHeight;

    doc.font("Times-Roman").fontSize(11);

    // Rows
    (attendeeData as Attendee[]).forEach((a: Attendee, i: number) => {
      const isEven = i % 2 === 0;

      if (isEven) {
        // light background for alternating rows
        doc
          .rect(45, y - 5, 510, rowHeight)
          .fill("#fafafa")
          .stroke();
        doc.fillColor("#000");
      }

      doc.text(a.buyer_name || "-", columnPositions.name, y);
      doc.text(a.buyer_email || "-", columnPositions.email, y, { width: 180 });
      doc.text(a.category || "-", columnPositions.category, y);
      doc.text(
        `₦${a.amount_paid?.toLocaleString() || "0"}`,
        columnPositions.amount,
        y,
        { align: "right" }
      );

      y += rowHeight;

      // Page break
      if (y > 750) {
        doc.addPage();
        y = tableTop;
      }
    });

    doc
      .fontSize(9)
      .fillColor("gray")
      .text(`Generated on ${new Date().toLocaleDateString()}`, 50, 780, {
        align: "center",
      });

    doc.end();

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${event.title
          .replace(/\s+/g, "_")
          .toLowerCase()}_attendees.pdf"`,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("PDF download error:", err.message);
    return NextResponse.json(
      { error: "Failed to generate attendee PDF" },
      { status: 500 }
    );
  }
}
