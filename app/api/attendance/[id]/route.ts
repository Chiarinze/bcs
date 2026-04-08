import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

interface Props {
  params: Promise<{ id: string }>;
}

// GET: get attendance session details with all records
export async function GET(_req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = createServerSupabase();

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("*, taker:profiles!taken_by(first_name, last_name, photo_url)")
    .eq("id", id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Fetch records with member info
  const { data: records, error: recordsError } = await supabase
    .from("attendance_records")
    .select("*, member:profiles!member_id(id, first_name, last_name, photo_url, ensemble_arm, choir_part)")
    .eq("session_id", id)
    .order("status");

  if (recordsError) {
    return NextResponse.json({ error: recordsError.message }, { status: 500 });
  }

  return NextResponse.json({
    session,
    records: records || [],
  });
}

// GET reports: /api/attendance/reports?type=monthly&month=2026-04 or type=yearly&year=2026
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // "id" is used as a special endpoint discriminator: "reports"
  if (id !== "reports") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createServerSupabase();
  const body = await req.json();
  const { type, month, year } = body;

  if (type === "monthly" && month) {
    // Get all sessions in the month
    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("id")
      .gte("session_date", `${month}-01`)
      .lt("session_date", (() => { const [y, m] = month.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`; })());

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: 0, members: [] });
    }

    const sessionIds = sessions.map((s: { id: string }) => s.id);

    // Get all records for these sessions
    const { data: records } = await supabase
      .from("attendance_records")
      .select("member_id, status, member:profiles!member_id(first_name, last_name, photo_url)")
      .in("session_id", sessionIds);

    if (!records) {
      return NextResponse.json({ sessions: sessions.length, members: [] });
    }

    // Aggregate per member
    const memberMap = new Map<string, {
      member_id: string;
      first_name: string;
      last_name: string;
      photo_url: string | null;
      present: number;
      absent_with_permission: number;
      absent: number;
      total: number;
    }>();

    for (const r of records) {
      const m = r.member as { first_name: string; last_name: string; photo_url: string | null } | null;
      if (!memberMap.has(r.member_id)) {
        memberMap.set(r.member_id, {
          member_id: r.member_id,
          first_name: m?.first_name || "",
          last_name: m?.last_name || "",
          photo_url: m?.photo_url || null,
          present: 0,
          absent_with_permission: 0,
          absent: 0,
          total: 0,
        });
      }
      const entry = memberMap.get(r.member_id)!;
      entry.total++;
      if (r.status === "present") entry.present++;
      else if (r.status === "absent_with_permission") entry.absent_with_permission++;
      else entry.absent++;
    }

    // Sort by most present
    const members = Array.from(memberMap.values()).sort(
      (a, b) => b.present - a.present || a.absent - b.absent
    );

    return NextResponse.json({
      sessions: sessions.length,
      members,
    });
  }

  if (type === "yearly" && year) {
    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("id")
      .gte("session_date", `${year}-01-01`)
      .lte("session_date", `${year}-12-31`);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: 0, members: [] });
    }

    const sessionIds = sessions.map((s: { id: string }) => s.id);

    const { data: records } = await supabase
      .from("attendance_records")
      .select("member_id, status, member:profiles!member_id(first_name, last_name, photo_url)")
      .in("session_id", sessionIds);

    if (!records) {
      return NextResponse.json({ sessions: sessions.length, members: [] });
    }

    const memberMap = new Map<string, {
      member_id: string;
      first_name: string;
      last_name: string;
      photo_url: string | null;
      present: number;
      absent_with_permission: number;
      absent: number;
      total: number;
    }>();

    for (const r of records) {
      const m = r.member as { first_name: string; last_name: string; photo_url: string | null } | null;
      if (!memberMap.has(r.member_id)) {
        memberMap.set(r.member_id, {
          member_id: r.member_id,
          first_name: m?.first_name || "",
          last_name: m?.last_name || "",
          photo_url: m?.photo_url || null,
          present: 0,
          absent_with_permission: 0,
          absent: 0,
          total: 0,
        });
      }
      const entry = memberMap.get(r.member_id)!;
      entry.total++;
      if (r.status === "present") entry.present++;
      else if (r.status === "absent_with_permission") entry.absent_with_permission++;
      else entry.absent++;
    }

    const members = Array.from(memberMap.values()).sort(
      (a, b) => b.present - a.present || a.absent - b.absent
    );

    return NextResponse.json({
      sessions: sessions.length,
      members,
    });
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}
