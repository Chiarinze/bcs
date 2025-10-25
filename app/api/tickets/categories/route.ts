import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const event_id = searchParams.get("event_id");

  if (!event_id)
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 });

  const { data, error } = await supabase
    .from("ticket_categories")
    .select("*")
    .eq("event_id", event_id)
    .order("price", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
