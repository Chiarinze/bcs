"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  User,
  Calendar,
  Clock,
  Lock,
  Pencil,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface MemberOption {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  ensemble_arm: string | null;
  choir_part: string | null;
}

interface EventOption {
  id: string;
  title: string;
  slug: string;
  date: string;
  end_date: string | null;
}

interface ServerSession {
  id: string;
  session_date: string;
  title: string;
  has_timestamp: boolean;
  event_id: string | null;
  signature: string;
  taken_by: string;
  taker?: { first_name?: string; last_name?: string } | null;
  event?: { id: string; title: string; slug: string } | null;
}

interface ServerRecord {
  member_id: string;
  status: string;
  note: string | null;
  marked_at: string | null;
}

interface MyRecord {
  id: string;
  status: string;
  note: string | null;
  marked_at: string | null;
  session?: {
    session_date: string;
    title: string;
    signature: string;
    has_timestamp: boolean;
  };
}

type Tab = "take" | "history";

const DEFAULT_TITLE = "Friday Rehearsal";
const CUSTOM_SENTINEL = "__custom__";

function slugifyTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function draftKey(date: string, title: string) {
  return `attendance_draft:${date}:${slugifyTitle(title)}`;
}

function todayLocalIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "take" ? "take" : "history";
  const today = todayLocalIso();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [isExecutive, setIsExecutive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Title + timestamp state
  const [titleSelect, setTitleSelect] = useState<string>(DEFAULT_TITLE);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [hasTimestamp, setHasTimestamp] = useState<boolean>(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);

  const effectiveTitle = useMemo(() => {
    if (titleSelect === DEFAULT_TITLE) return DEFAULT_TITLE;
    if (titleSelect === CUSTOM_SENTINEL) return customTitle.trim();
    if (titleSelect.startsWith("event:")) {
      const evId = titleSelect.slice("event:".length);
      const ev = events.find((e) => e.id === evId);
      return ev ? `Attendance for ${ev.title}` : "";
    }
    return "";
  }, [titleSelect, customTitle, events]);

  // Session / edit state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [lockedBy, setLockedBy] = useState<{
    signature: string;
    takerName: string;
  } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Members + marks
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [presentMarks, setPresentMarks] = useState<Map<string, string | null>>(
    new Map()
  );
  const [absentWithPerm, setAbsentWithPerm] = useState<Map<string, string>>(
    new Map()
  );
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Submit / modal
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  // History
  const [myRecords, setMyRecords] = useState<MyRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: execRole } = await supabase
        .from("member_roles")
        .select("id")
        .eq("assigned_to", user.id)
        .eq("category", "executive")
        .limit(1)
        .maybeSingle();

      const hasExec = !!execRole;
      setIsExecutive(hasExec);

      if (hasExec) {
        setTab("take");
        const [membersRes, eventsRes] = await Promise.all([
          fetch("/api/members/verified"),
          fetch("/api/attendance/events-list"),
        ]);
        if (membersRes.ok) setMembers(await membersRes.json());
        if (eventsRes.ok) setEvents(await eventsRes.json());
      } else {
        const historyRes = await fetch("/api/attendance?view=my");
        if (historyRes.ok) setMyRecords(await historyRes.json());
      }

      setLoading(false);
    }

    init();
  }, []);

  // Track the most recently requested title so stale responses can be ignored
  const activeRequestTitleRef = useRef<string>("");

  // ─── When title changes: load existing session or localStorage draft ──
  const loadForTitle = useCallback(
    async (title: string, autoHasTimestamp: boolean | null) => {
      if (!title) {
        activeRequestTitleRef.current = "";
        setEditingSessionId(null);
        setLockedBy(null);
        setPresentMarks(new Map());
        setAbsentWithPerm(new Map());
        return;
      }

      activeRequestTitleRef.current = title;
      setSessionLoading(true);
      setLockedBy(null);

      try {
        const res = await fetch(
          `/api/attendance?date=${today}&title=${encodeURIComponent(title)}`
        );

        // If another request started for a different title, drop this response
        if (activeRequestTitleRef.current !== title) return;

        if (!res.ok) return;

        const data = await res.json();
        if (activeRequestTitleRef.current !== title) return;

        if (data?.session) {
          const session = data.session as ServerSession;

          if (!data.canEdit) {
            const takerName =
              session.taker?.first_name && session.taker?.last_name
                ? `${session.taker.first_name} ${session.taker.last_name}`
                : "another executive";
            setEditingSessionId(null);
            setLockedBy({
              signature: session.signature,
              takerName,
            });
            setPresentMarks(new Map());
            setAbsentWithPerm(new Map());
            return;
          }

          // Editable existing session
          setEditingSessionId(session.id);
          setHasTimestamp(!!session.has_timestamp);

          const records: ServerRecord[] = data.records || [];
          const nextPresent = new Map<string, string | null>();
          const nextAbsentPerm = new Map<string, string>();
          for (const r of records) {
            if (r.status === "present") {
              nextPresent.set(r.member_id, r.marked_at);
            } else if (r.status === "absent_with_permission") {
              nextAbsentPerm.set(r.member_id, r.note || "");
            }
          }
          setPresentMarks(nextPresent);
          setAbsentWithPerm(nextAbsentPerm);
          return;
        }

        // No server session exists for this (date, title) — fresh state.
        setEditingSessionId(null);
        if (autoHasTimestamp !== null) setHasTimestamp(autoHasTimestamp);

        const key = draftKey(today, title);
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw) as {
              hasTimestamp?: boolean;
              present?: Record<string, string | null>;
              absentWithPermission?: Record<string, string>;
            };
            if (typeof draft.hasTimestamp === "boolean") {
              setHasTimestamp(draft.hasTimestamp);
            }
            setPresentMarks(new Map(Object.entries(draft.present || {})));
            setAbsentWithPerm(
              new Map(Object.entries(draft.absentWithPermission || {}))
            );
            return;
          }
        } catch {
          // ignore localStorage errors
        }

        setPresentMarks(new Map());
        setAbsentWithPerm(new Map());
      } finally {
        if (activeRequestTitleRef.current === title) {
          setSessionLoading(false);
        }
      }
    },
    [today]
  );

  // React to title select changes
  useEffect(() => {
    if (!isExecutive) return;
    if (tab !== "take") return;

    let autoTimestamp: boolean | null = null;
    let title = "";

    if (titleSelect === DEFAULT_TITLE) {
      title = DEFAULT_TITLE;
      autoTimestamp = false;
      setEventId(null);
    } else if (titleSelect === CUSTOM_SENTINEL) {
      title = customTitle.trim();
      autoTimestamp = true;
      setEventId(null);
    } else {
      // Event option — titleSelect is `event:<id>`
      const evId = titleSelect.startsWith("event:")
        ? titleSelect.slice("event:".length)
        : null;
      const ev = events.find((e) => e.id === evId);
      if (ev) {
        title = `Attendance for ${ev.title}`;
        autoTimestamp = true;
        setEventId(ev.id);
      }
    }

    loadForTitle(title, autoTimestamp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleSelect, customTitle, events, isExecutive, tab]);

  // ─── Persist draft to localStorage on every meaningful change ──────
  useEffect(() => {
    if (!effectiveTitle) return;
    if (editingSessionId) return; // editing server session → don't write a draft
    if (lockedBy) return;

    const key = draftKey(today, effectiveTitle);
    const payload = {
      title: effectiveTitle,
      hasTimestamp,
      eventId,
      present: Object.fromEntries(presentMarks),
      absentWithPermission: Object.fromEntries(absentWithPerm),
    };

    try {
      if (
        presentMarks.size === 0 &&
        absentWithPerm.size === 0 &&
        hasTimestamp === (titleSelect === DEFAULT_TITLE ? false : true)
      ) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(payload));
      }
    } catch {
      // ignore
    }
  }, [
    presentMarks,
    absentWithPerm,
    hasTimestamp,
    effectiveTitle,
    eventId,
    editingSessionId,
    lockedBy,
    titleSelect,
    today,
  ]);

  // ─── History loader ────────────────────────────────────────────────
  useEffect(() => {
    if (tab === "history" && myRecords.length === 0 && !historyLoading) {
      (async () => {
        setHistoryLoading(true);
        const res = await fetch("/api/attendance?view=my");
        if (res.ok) setMyRecords(await res.json());
        setHistoryLoading(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ─── Tap handlers ──────────────────────────────────────────────────
  function togglePresent(memberId: string) {
    setPresentMarks((prev) => {
      const next = new Map(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.set(memberId, new Date().toISOString());
        // Ensure not also in absent_with_permission
        setAbsentWithPerm((p) => {
          const n = new Map(p);
          n.delete(memberId);
          return n;
        });
      }
      return next;
    });
  }

  function markAbsentWithPermission(memberId: string, note: string) {
    setPresentMarks((prev) => {
      const next = new Map(prev);
      next.delete(memberId);
      return next;
    });
    setAbsentWithPerm((prev) => {
      const next = new Map(prev);
      next.set(memberId, note);
      return next;
    });
    setEditingNote(null);
    setNoteText("");
  }

  function removeAbsentPermission(memberId: string) {
    setAbsentWithPerm((prev) => {
      const next = new Map(prev);
      next.delete(memberId);
      return next;
    });
  }

  function selectAllPresent() {
    const now = new Date().toISOString();
    const next = new Map<string, string | null>();
    for (const m of filteredMembers) next.set(m.id, now);
    setPresentMarks(next);
    setAbsentWithPerm(new Map());
  }

  function clearAll() {
    setPresentMarks(new Map());
    setAbsentWithPerm(new Map());
  }

  // ─── Submit ────────────────────────────────────────────────────────
  async function actuallySubmit() {
    if (!effectiveTitle) {
      alert("Please provide a name for this attendance.");
      return;
    }
    setSubmitting(true);

    const presentPayload = Array.from(presentMarks.entries()).map(
      ([member_id, marked_at]) => ({
        member_id,
        marked_at: hasTimestamp ? marked_at : null,
      })
    );
    const absentPayload = Array.from(absentWithPerm.entries()).map(
      ([member_id, note]) => ({ member_id, note })
    );

    const url = editingSessionId
      ? `/api/attendance/${editingSessionId}`
      : "/api/attendance";
    const method = editingSessionId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        title: effectiveTitle,
        event_id: eventId,
        has_timestamp: hasTimestamp,
        present: presentPayload,
        absent_with_permission: absentPayload,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      // Clear draft
      try {
        localStorage.removeItem(draftKey(today, effectiveTitle));
      } catch {
        // ignore
      }
      if (!editingSessionId && data.session_id) {
        setEditingSessionId(data.session_id);
      }
      setConfirmOpen(false);
      setFlashMessage(
        editingSessionId
          ? "Attendance updated successfully."
          : `Attendance submitted. You can still add late arrivals below.`
      );
    } else {
      alert(data.error || "Failed to submit attendance");
    }

    setSubmitting(false);
  }

  const filteredMembers = members.filter((m) => {
    if (!search) return true;
    const name = `${m.first_name} ${m.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  function getMemberStatus(
    memberId: string
  ): "present" | "absent_with_permission" | "unmarked" {
    if (presentMarks.has(memberId)) return "present";
    if (absentWithPerm.has(memberId)) return "absent_with_permission";
    return "unmarked";
  }

  const presentCount = presentMarks.size;
  const excusedCount = absentWithPerm.size;
  const absentCount = Math.max(
    0,
    members.length - presentCount - excusedCount
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-8 w-8 border-3 border-bcs-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-bcs-green">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isExecutive
            ? "Take attendance or view your history."
            : "View your attendance history."}
        </p>
      </div>

      {/* Tabs */}
      {isExecutive && (
        <div className="flex items-center gap-1 border-b border-gray-200">
          <button
            onClick={() => setTab("take")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "take"
                ? "border-bcs-green text-bcs-green"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Take Attendance
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "history"
                ? "border-bcs-green text-bcs-green"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            My History
          </button>
        </div>
      )}

      {/* Take Attendance Tab */}
      {tab === "take" && isExecutive && (
        <>
          {/* Title picker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Attendance name
              </label>
              <select
                value={titleSelect}
                onChange={(e) => setTitleSelect(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
              >
                <option value={DEFAULT_TITLE}>Friday Rehearsal</option>
                {events.length > 0 && (
                  <optgroup label="Upcoming internal events">
                    {events.map((ev) => (
                      <option key={ev.id} value={`event:${ev.id}`}>
                        Attendance for {ev.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value={CUSTOM_SENTINEL}>Custom name…</option>
              </select>

              {titleSelect === CUSTOM_SENTINEL && (
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Vocal sectional rehearsal"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                />
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasTimestamp}
                onChange={(e) => setHasTimestamp(e.target.checked)}
                className="mt-1 accent-bcs-green"
              />
              <span>
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Record timestamps
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Captures the time each member was marked present.
                </span>
              </span>
            </label>
          </div>

          {/* Session loading indicator */}
          {sessionLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="h-4 w-4 border-2 border-bcs-green border-t-transparent rounded-full animate-spin" />
              Checking for existing attendance…
            </div>
          )}

          {/* Locked banner — someone else took this already */}
          {lockedBy && !sessionLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <p className="text-amber-900 font-medium">
                {lockedBy.signature}
              </p>
              <p className="text-sm text-amber-700 mt-2">
                Only {lockedBy.takerName} or an admin can edit this attendance.
                Pick a different name to take a separate attendance.
              </p>
            </div>
          )}

          {/* Editing-mode banner */}
          {editingSessionId && !sessionLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-800">
                Editing existing attendance. Your changes will update it.
              </p>
            </div>
          )}

          {/* Flash message after submit */}
          {flashMessage && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <p className="text-sm text-green-800">{flashMessage}</p>
              <button
                onClick={() => setFlashMessage(null)}
                className="text-green-700 text-xs font-medium hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Only show marking UI if not locked */}
          {!lockedBy && !sessionLoading && effectiveTitle && (
            <div className="space-y-4">
              {/* Date + Stats Bar */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-bcs-green" />
                    <span className="font-semibold text-gray-900">
                      {new Date().toLocaleDateString("en-NG", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-600 font-medium">
                      Present: {presentCount}
                    </span>
                    <span className="text-amber-600 font-medium">
                      Excused: {excusedCount}
                    </span>
                    <span className="text-red-500 font-medium">
                      Absent: {absentCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search + Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search members..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllPresent}
                    className="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition"
                  >
                    Select All Present
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {filteredMembers.map((member) => {
                  const status = getMemberStatus(member.id);
                  const markedAt = presentMarks.get(member.id) || null;

                  return (
                    <div key={member.id} className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        {member.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.photo_url}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-bcs-green/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-bcs-green" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          {status === "present" &&
                          hasTimestamp &&
                          markedAt ? (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Marked at {formatTime(markedAt)}
                            </p>
                          ) : member.choir_part ? (
                            <p className="text-xs text-gray-400">
                              {member.choir_part}
                            </p>
                          ) : null}
                        </div>

                        {status === "present" && (
                          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                            Present
                          </span>
                        )}
                        {status === "absent_with_permission" && (
                          <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                            Excused
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => togglePresent(member.id)}
                            className={`p-1.5 rounded-lg transition ${
                              status === "present"
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600"
                            }`}
                            title="Mark present"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (status === "absent_with_permission") {
                                removeAbsentPermission(member.id);
                              } else {
                                setEditingNote(member.id);
                                setNoteText(absentWithPerm.get(member.id) || "");
                              }
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              status === "absent_with_permission"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                            }`}
                            title="Absent with permission"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {editingNote === member.id && (
                        <div className="mt-2 ml-12 flex gap-2">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Reason for absence..."
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              markAbsentWithPermission(member.id, noteText)
                            }
                            className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingNote(null);
                              setNoteText("");
                            }}
                            className="px-2 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {status === "absent_with_permission" &&
                        editingNote !== member.id &&
                        absentWithPerm.get(member.id) && (
                          <p className="mt-1 ml-12 text-xs text-amber-600 italic">
                            {absentWithPerm.get(member.id)}
                          </p>
                        )}
                    </div>
                  );
                })}
              </div>

              {/* Submit */}
              <div className="sticky bottom-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (presentCount === 0 && excusedCount === 0) {
                      alert(
                        "Please mark at least one member as present or absent with permission."
                      );
                      return;
                    }
                    setConfirmOpen(true);
                  }}
                  className="w-full py-3 text-base"
                >
                  <ClipboardList className="w-5 h-5 mr-2" />
                  {editingSessionId ? "Update Attendance" : "Submit Attendance"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {(tab === "history" || !isExecutive) && (
        <div className="space-y-4">
          {historyLoading ? (
            <div className="flex justify-center py-12">
              <span className="h-6 w-6 border-2 border-bcs-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myRecords.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No attendance records yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {myRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    {record.status === "present" ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : record.status === "absent_with_permission" ? (
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {record.session?.title || "Attendance"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.session?.session_date
                          ? new Date(
                              record.session.session_date + "T00:00:00"
                            ).toLocaleDateString("en-NG", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                        {record.marked_at && (
                          <span className="ml-2 text-gray-400">
                            • {formatTime(record.marked_at)}
                          </span>
                        )}
                      </p>
                      {record.note && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          {record.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      record.status === "present"
                        ? "bg-green-50 text-green-700"
                        : record.status === "absent_with_permission"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {record.status === "present"
                      ? "Present"
                      : record.status === "absent_with_permission"
                      ? "Excused"
                      : "Absent"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {editingSessionId
                ? "Update this attendance?"
                : "Submit this attendance?"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-900">
                {effectiveTitle}
              </span>{" "}
              on{" "}
              {new Date().toLocaleDateString("en-NG", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Present</span>
                <span className="font-semibold text-green-600">
                  {presentCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Excused</span>
                <span className="font-semibold text-amber-600">
                  {excusedCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Absent</span>
                <span className="font-semibold text-red-500">
                  {absentCount}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 mt-1.5 border-t border-gray-200">
                <span className="text-gray-600">Timestamps</span>
                <span className="font-medium text-gray-900">
                  {hasTimestamp ? "On" : "Off"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                onClick={actuallySubmit}
                loading={submitting}
                className="flex-1 py-2.5 text-sm"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
