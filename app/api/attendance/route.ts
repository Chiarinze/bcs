import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

// GET: list attendance sessions (admin/exec), a member's own history, or look up an existing session by (date, title)
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view"); // "my" for member's own history
  const month = searchParams.get("month"); // "2026-04" format
  const year = searchParams.get("year"); // "2026" format
  const lookupDate = searchParams.get("date"); // e.g. "2026-04-23"
  const lookupTitle = searchParams.get("title"); // e.g. "Friday Rehearsal"

  // Lookup mode: find the session for this (date, title) if one exists, and return records if caller can edit it
  if (lookupDate && lookupTitle) {
    const { data: session } = await supabase
      .from("attendance_sessions")
      .select(
        "*, taker:profiles!taken_by(first_name, last_name, photo_url), event:events(id, title, slug)"
      )
      .eq("session_date", lookupDate)
      .eq("title", lookupTitle)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ session: null });
    }

    // Determine permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.id)
      .single();
    const canEdit = session.taken_by === auth.id || profile?.role === "admin";

    if (!canEdit) {
      return NextResponse.json({ session, canEdit: false, records: [] });
    }

    const { data: records } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("session_id", session.id);

    return NextResponse.json({ session, canEdit: true, records: records || [] });
  }

  if (view === "my") {
    const query = supabase
      .from("attendance_records")
      .select(
        "*, session:attendance_sessions!session_id(session_date, title, signature, has_timestamp)"
      )
      .eq("member_id", auth.id)
      .order("session_id", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
    .select(
      "*, taker:profiles!taken_by(first_name, last_name, photo_url), event:events(id, title, slug)"
    )
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

  const { data: taker } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", auth.id)
    .single();

  if (!taker) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    date,
    title,
    event_id,
    has_timestamp,
    present,
    absent_with_permission,
  } = body;
  // present: { member_id: string, marked_at?: string }[]  (marked_at is ISO captured at tap; only honored when has_timestamp)
  // absent_with_permission: { member_id: string, note: string }[]

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  if (!trimmedTitle) {
    return NextResponse.json({ error: "Attendance name is required" }, { status: 400 });
  }

  // Check if a session already exists for this (date, title)
  const { data: existing } = await supabase
    .from("attendance_sessions")
    .select("id, signature, taken_by")
    .eq("session_date", date)
    .eq("title", trimmedTitle)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: `"${trimmedTitle}" for this day has already been taken. ${existing.signature}. Only the original taker or an admin can edit it.`,
      },
      { status: 409 }
    );
  }

  const signature = `Taken by ${taker.first_name} ${taker.last_name} (${executiveRole.title})`;

  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .insert({
      session_date: date,
      title: trimmedTitle,
      event_id: event_id || null,
      has_timestamp: !!has_timestamp,
      taken_by: auth.id,
      signature,
    })
    .select("id")
    .single();

  if (sessionError) {
    if (sessionError.code === "23505") {
      return NextResponse.json(
        { error: `"${trimmedTitle}" for this day has already been taken` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .eq("profile_completed", true);

  if (!allMembers || allMembers.length === 0) {
    return NextResponse.json({ error: "No members found" }, { status: 400 });
  }

  const presentMap = new Map<string, string | null>();
  if (Array.isArray(present)) {
    for (const entry of present) {
      if (typeof entry === "string") {
        // Backwards-compat: bare ID
        presentMap.set(entry, null);
      } else if (entry && typeof entry.member_id === "string") {
        presentMap.set(
          entry.member_id,
          has_timestamp && entry.marked_at ? entry.marked_at : null
        );
      }
    }
  }

  const absentWithPermMap = new Map<string, string>();
  if (Array.isArray(absent_with_permission)) {
    for (const entry of absent_with_permission) {
      absentWithPermMap.set(entry.member_id, entry.note || "");
    }
  }

  const records = allMembers.map((m: { id: string }) => {
    let status: string = "absent";
    let note: string | null = null;
    let marked_at: string | null = null;

    if (presentMap.has(m.id)) {
      status = "present";
      marked_at = presentMap.get(m.id) || null;
    } else if (absentWithPermMap.has(m.id)) {
      status = "absent_with_permission";
      note = absentWithPermMap.get(m.id) || null;
    }

    return {
      session_id: session.id,
      member_id: m.id,
      status,
      note,
      marked_at,
    };
  });

  const { error: recordsError } = await supabase
    .from("attendance_records")
    .insert(records);

  if (recordsError) {
    await supabase.from("attendance_sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: recordsError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      session_id: session.id,
      signature,
      total: allMembers.length,
      present: presentMap.size,
      absent_with_permission: absentWithPermMap.size,
      absent: allMembers.length - presentMap.size - absentWithPermMap.size,
    },
    { status: 201 }
  );
}
