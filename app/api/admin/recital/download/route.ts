import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRecitalDate } from "@/lib/recital";

type BookingRow = {
  recital_date: string;
  chosen_piece: string;
  profile: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  try {
    const { data: bookings, error } = await supabase
      .from("recital_bookings")
      .select("recital_date, chosen_piece, profile:profiles!profile_id(first_name, last_name)")
      .order("recital_date");

    if (error) throw error;

    const doc = new jsPDF();
    doc.text("Recital Roster", 14, 15);

    const tableRows = ((bookings as BookingRow[]) || []).map((b) => {
      const profile = Array.isArray(b.profile) ? b.profile[0] : b.profile;
      const name = profile ? `${profile.first_name} ${profile.last_name}` : "N/A";
      return [name, formatRecitalDate(b.recital_date), b.chosen_piece];
    });

    autoTable(doc, {
      startY: 20,
      head: [["Name", "Recital Date", "Piece"]],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [21, 94, 117] },
    });

    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="recital-roster.pdf"`,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
