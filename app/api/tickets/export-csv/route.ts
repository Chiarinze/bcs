import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic"; // always fetch fresh data

interface Attendee {
  buyer_name: string;
  buyer_email: string;
  category: string | null;
  amount_paid: number | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  if (!event_id) {
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabase();

    let query = supabase
      .from("tickets")
      .select("buyer_name,buyer_email,category,amount_paid,created_at")
      .eq("event_id", event_id)
      .order("created_at", { ascending: false });

    if (search.trim() !== "") {
      query = query.or(
        `buyer_name.ilike.%${search.trim()}%,buyer_email.ilike.%${search.trim()}%`
      );
    }

    if (category.trim() !== "") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No attendees found" },
        { status: 404 }
      );
    }

    // Convert to CSV
    const headers = [
      "Name",
      "Email",
      "Category",
      "Amount Paid (₦)",
      "Registered At",
    ];

    const rows = (data as Attendee[]).map((a: Attendee) => [
      a.buyer_name,
      a.buyer_email,
      a.category || "",
      a.amount_paid?.toLocaleString() || "0",
      new Date(a.created_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendees-${event_id}.csv"`,
      },
    });
  } catch (err) {
    console.error("CSV export error:", err);
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 }
    );
  }
}
