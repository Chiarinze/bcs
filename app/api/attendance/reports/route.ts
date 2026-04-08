import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const supabase = createServerSupabase();
  const body = await req.json();
  const { type, month, year } = body;

  if (type === "monthly" && month) {
    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("id")
      .gte("session_date", `${month}-01`)
      .lt("session_date", (() => { const [y, m] = month.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`; })());

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

    const members = aggregateRecords(records);

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

    const members = aggregateRecords(records);

    return NextResponse.json({
      sessions: sessions.length,
      members,
    });
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}

function aggregateRecords(
  records: { member_id: string; status: string; member: { first_name: string; last_name: string; photo_url: string | null } | null }[]
) {
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

  return Array.from(memberMap.values()).sort(
    (a, b) => b.present - a.present || a.absent - b.absent
  );
}
