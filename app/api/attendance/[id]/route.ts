import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";

interface Props {
  params: Promise<{ id: string }>;
}

// GET: attendance session details with all records (plus edit permission flag)
export async function GET(_req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select(
      "*, taker:profiles!taken_by(first_name, last_name, photo_url), event:events(id, title, slug)"
    )
    .eq("id", id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: records, error: recordsError } = await supabase
    .from("attendance_records")
    .select(
      "*, member:profiles!member_id(id, first_name, last_name, photo_url, ensemble_arm, choir_part)"
    )
    .eq("session_id", id)
    .order("status");

  if (recordsError) {
    return NextResponse.json({ error: recordsError.message }, { status: 500 });
  }

  // Determine edit permission: original taker OR admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.id)
    .single();
  const canEdit = session.taken_by === auth.id || profile?.role === "admin";

  return NextResponse.json({
    session,
    records: records || [],
    canEdit,
  });
}

// PUT: edit an existing attendance session. Only the original taker or an admin may edit.
export async function PUT(req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = createServerSupabase();

  // Fetch session and verify permission
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("id, taken_by, has_timestamp, title")
    .eq("id", id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const isTaker = session.taken_by === auth.id;

  if (!isAdmin && !isTaker) {
    return NextResponse.json(
      { error: "Only the original taker or an admin can edit this attendance" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    title,
    has_timestamp,
    present,
    absent_with_permission,
  } = body;

  // Optional title rename
  const sessionUpdate: {
    title?: string;
    has_timestamp?: boolean;
  } = {};

  if (typeof title === "string") {
    const trimmed = title.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Attendance name is required" }, { status: 400 });
    }
    sessionUpdate.title = trimmed;
  }

  if (typeof has_timestamp === "boolean") {
    sessionUpdate.has_timestamp = has_timestamp;
  }

  const effectiveHasTimestamp =
    typeof has_timestamp === "boolean" ? has_timestamp : session.has_timestamp;

  if (Object.keys(sessionUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from("attendance_sessions")
      .update(sessionUpdate)
      .eq("id", id);

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "Another attendance with this name already exists for this date" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Load existing records so we can preserve marked_at when status doesn't change
  const { data: existingRecords } = await supabase
    .from("attendance_records")
    .select("member_id, status, marked_at")
    .eq("session_id", id);

  const existingMap = new Map<
    string,
    { status: string; marked_at: string | null }
  >();
  for (const r of existingRecords || []) {
    existingMap.set(r.member_id, { status: r.status, marked_at: r.marked_at });
  }

  const presentMap = new Map<string, string | null>();
  if (Array.isArray(present)) {
    for (const entry of present) {
      if (typeof entry === "string") {
        presentMap.set(entry, null);
      } else if (entry && typeof entry.member_id === "string") {
        presentMap.set(
          entry.member_id,
          effectiveHasTimestamp && entry.marked_at ? entry.marked_at : null
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

  // Load all member IDs (profile_completed) to rebuild the full roster
  const { data: allMembers } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "member")
    .eq("profile_completed", true);

  if (!allMembers || allMembers.length === 0) {
    return NextResponse.json({ error: "No members found" }, { status: 400 });
  }

  type RecordUpsert = {
    session_id: string;
    member_id: string;
    status: string;
    note: string | null;
    marked_at: string | null;
  };

  const rows: RecordUpsert[] = allMembers.map((m: { id: string }) => {
    let status: string = "absent";
    let note: string | null = null;
    let marked_at: string | null = null;

    if (presentMap.has(m.id)) {
      status = "present";
      const clientStamp = presentMap.get(m.id) || null;
      const prior = existingMap.get(m.id);
      if (effectiveHasTimestamp) {
        // Preserve existing marked_at if member was already present and no new stamp supplied
        if (prior?.status === "present" && prior.marked_at && !clientStamp) {
          marked_at = prior.marked_at;
        } else {
          marked_at = clientStamp;
        }
      } else {
        marked_at = null;
      }
    } else if (absentWithPermMap.has(m.id)) {
      status = "absent_with_permission";
      note = absentWithPermMap.get(m.id) || null;
    }

    return {
      session_id: id,
      member_id: m.id,
      status,
      note,
      marked_at,
    };
  });

  const { error: upsertError } = await supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "session_id,member_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    session_id: id,
    total: allMembers.length,
    present: presentMap.size,
    absent_with_permission: absentWithPermMap.size,
    absent: allMembers.length - presentMap.size - absentWithPermMap.size,
  });
}

// Reports discriminator (unchanged)
export async function POST(req: NextRequest, { params }: Props) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (id !== "reports") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
