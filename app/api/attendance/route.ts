import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

// GET: list attendance sessions (admin: all, member: own records)
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view"); // "my" for member's own history
  const month = searchParams.get("month"); // "2026-04" format
  const year = searchParams.get("year"); // "2026" format

  if (view === "my") {
    // Member's own attendance history
    const query = supabase
      .from("attendance_records")
      .select("*, session:attendance_sessions!session_id(session_date, signature)")
      .eq("member_id", auth.id)
      .order("session_id", { ascending: false });

    // We'll filter by date on the session side
    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter by month/year client-side since we can't filter nested easily
    let records = data || [];
    if (month) {
      records = records.filter((r: { session?: { session_date?: string } }) =>
        r.session?.session_date?.startsWith(month)
      );
    } else if (year) {
      records = records.filter((r: { session?: { session_date?: string } }) =>
        r.session?.session_date?.startsWith(year)
      );
    }

    return NextResponse.json(records);
  }

  // Admin/executive: list all sessions
  let query = supabase
    .from("attendance_sessions")
    .select("*, taker:profiles!taken_by(first_name, last_name, photo_url)")
    .order("session_date", { ascending: false });

  if (month) {
    const [y, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    query = query.gte("session_date", `${month}-01`).lt("session_date", nextMonth);
  } else if (year) {
    query = query.gte("session_date", `${year}-01-01`).lte("session_date", `${year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST: create a new attendance session and submit all records
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  // Verify caller holds an executive role
  const { data: executiveRole } = await supabase
    .from("member_roles")
    .select("title")
    .eq("assigned_to", auth.id)
    .eq("category", "executive")
    .limit(1)
    .maybeSingle();

  if (!executiveRole) {
    return NextResponse.json(
      { error: "Only Board of Directors members can take attendance" },
      { status: 403 }
    );
  }

  // Get the taker's name
  const { data: taker } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", auth.id)
    .single();

  if (!taker) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await req.json();
  const { date, present, absent_with_permission } = body;
  // present: string[] (member IDs)
  // absent_with_permission: { member_id: string, note: string }[]

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  // Check if attendance already exists for this date
  const { data: existing } = await supabase
    .from("attendance_sessions")
    .select("id, signature")
    .eq("session_date", date)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Attendance for this day has already been taken. ${existing.signature}` },
      { status: 409 }
    );
  }

  const signature = `Taken by ${taker.first_name} ${taker.last_name} (${executiveRole.title})`;

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .insert({
      session_date: date,
      taken_by: auth.id,
      signature,
    })
    .select("id")
    .single();

  if (sessionError) {
    if (sessionError.code === "23505") {
      return NextResponse.json(
        { error: "Attendance for this day has already been taken" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Get all members with completed profiles
  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .eq("profile_completed", true);

  if (!allMembers || allMembers.length === 0) {
    return NextResponse.json({ error: "No members found" }, { status: 400 });
  }

  const presentSet = new Set(present || []);
  const absentWithPermMap = new Map<string, string>();
  if (absent_with_permission) {
    for (const entry of absent_with_permission) {
      absentWithPermMap.set(entry.member_id, entry.note || "");
    }
  }

  // Build records for all members
  const records = allMembers.map((m: { id: string }) => {
    let status: string = "absent";
    let note: string | null = null;

    if (presentSet.has(m.id)) {
      status = "present";
    } else if (absentWithPermMap.has(m.id)) {
      status = "absent_with_permission";
      note = absentWithPermMap.get(m.id) || null;
    }

    return {
      session_id: session.id,
      member_id: m.id,
      status,
      note,
    };
  });

  const { error: recordsError } = await supabase
    .from("attendance_records")
    .insert(records);

  if (recordsError) {
    // Clean up session if records fail
    await supabase.from("attendance_sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: recordsError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    session_id: session.id,
    signature,
    total: allMembers.length,
    present: presentSet.size,
    absent_with_permission: absentWithPermMap.size,
    absent: allMembers.length - presentSet.size - absentWithPermMap.size,
  }, { status: 201 });
}
