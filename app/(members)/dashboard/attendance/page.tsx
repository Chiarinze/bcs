"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
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

interface MyRecord {
  id: string;
  status: string;
  note: string | null;
  session?: { session_date: string; signature: string };
}

type Tab = "take" | "history";

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "take" ? "take" : "history";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [isExecutive, setIsExecutive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Take attendance state
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [absentWithPerm, setAbsentWithPerm] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [todayTaken, setTodayTaken] = useState<string | null>(null);

  // History state
  const [myRecords, setMyRecords] = useState<MyRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Absent permission note editing
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    async function init() {
      // Check if user is an executive
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Check executive role directly via Supabase
      let hasExecRole = false;
      const { data: execRole } = await supabase
        .from("member_roles")
        .select("id")
        .eq("assigned_to", user.id)
        .eq("category", "executive")
        .limit(1)
        .maybeSingle();

      hasExecRole = !!execRole;
      setIsExecutive(hasExecRole);
      if (hasExecRole) {
        setTab("take");
        // Pre-load members for the take tab
        const membersRes = await fetch("/api/members/verified");
        if (membersRes.ok) {
          setMembers(await membersRes.json());
        }
      }

      // Check if today's attendance is already taken
      const today = new Date().toISOString().split("T")[0];
      const sessionsRes = await fetch(`/api/attendance?month=${today.slice(0, 7)}`);
      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        const todaySession = sessions.find(
          (s: { session_date: string }) => s.session_date === today
        );
        if (todaySession) {
          setTodayTaken(todaySession.signature);
        }
      }

      // Load history if not executive (they start on history tab)
      if (!hasExecRole) {
        const historyRes = await fetch("/api/attendance?view=my");
        if (historyRes.ok) {
          setMyRecords(await historyRes.json());
        }
      }

      setLoading(false);
    }

    init();
  }, []);

  useEffect(() => {
    if (tab === "take" && isExecutive && members.length === 0) {
      loadMembers();
    }
    if (tab === "history" && myRecords.length === 0) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isExecutive]);

  async function loadMembers() {
    const res = await fetch("/api/members/verified");
    if (res.ok) {
      setMembers(await res.json());
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    const res = await fetch("/api/attendance?view=my");
    if (res.ok) {
      setMyRecords(await res.json());
    }
    setHistoryLoading(false);
  }

  function togglePresent(memberId: string) {
    setPresentIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
        // Remove from absent with permission if was there
        setAbsentWithPerm((prev) => {
          const next = new Map(prev);
          next.delete(memberId);
          return next;
        });
      }
      return next;
    });
  }

  function markAbsentWithPermission(memberId: string, note: string) {
    // Remove from present if was there
    setPresentIds((prev) => {
      const next = new Set(prev);
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
    setPresentIds(new Set(filteredMembers.map((m) => m.id)));
    setAbsentWithPerm(new Map());
  }

  function clearAll() {
    setPresentIds(new Set());
    setAbsentWithPerm(new Map());
  }

  async function handleSubmit() {
    if (presentIds.size === 0 && absentWithPerm.size === 0) {
      alert("Please mark at least one member as present or absent with permission");
      return;
    }

    const total = members.length;
    const absentCount = total - presentIds.size - absentWithPerm.size;

    if (
      !confirm(
        `Submit attendance?\n\nPresent: ${presentIds.size}\nAbsent with permission: ${absentWithPerm.size}\nAbsent: ${absentCount}\nTotal: ${total}`
      )
    )
      return;

    setSubmitting(true);

    const today = new Date().toISOString().split("T")[0];

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        present: Array.from(presentIds),
        absent_with_permission: Array.from(absentWithPerm.entries()).map(
          ([member_id, note]) => ({ member_id, note })
        ),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setTodayTaken(data.signature);
      alert(`Attendance submitted successfully!\n\n${data.signature}`);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to submit attendance");
    }

    setSubmitting(false);
  }

  const filteredMembers = members.filter((m) => {
    if (!search) return true;
    const name = `${m.first_name} ${m.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  function getMemberStatus(memberId: string): "present" | "absent_with_permission" | "unmarked" {
    if (presentIds.has(memberId)) return "present";
    if (absentWithPerm.has(memberId)) return "absent_with_permission";
    return "unmarked";
  }

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
            ? "Take rehearsal attendance or view your history."
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
          {todayTaken ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="text-green-800 font-medium">
                Today&apos;s attendance has already been taken.
              </p>
              <p className="text-sm text-green-600 mt-1">{todayTaken}</p>
            </div>
          ) : (
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
                      Present: {presentIds.size}
                    </span>
                    <span className="text-amber-600 font-medium">
                      Excused: {absentWithPerm.size}
                    </span>
                    <span className="text-red-500 font-medium">
                      Absent: {members.length - presentIds.size - absentWithPerm.size}
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

                  return (
                    <div key={member.id} className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        {/* Photo */}
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

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          {member.choir_part && (
                            <p className="text-xs text-gray-400">{member.choir_part}</p>
                          )}
                        </div>

                        {/* Status indicator */}
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

                        {/* Actions */}
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

                      {/* Note input for absent with permission */}
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

                      {/* Show saved note */}
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
                  loading={submitting}
                  onClick={handleSubmit}
                  className="w-full py-3 text-base"
                >
                  <ClipboardList className="w-5 h-5 mr-2" />
                  Submit Attendance
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* History Tab (or default for non-executives) */}
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
                <div key={record.id} className="flex items-center justify-between p-4">
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
                        {record.session?.session_date
                          ? new Date(record.session.session_date + "T00:00:00").toLocaleDateString(
                              "en-NG",
                              { weekday: "long", year: "numeric", month: "long", day: "numeric" }
                            )
                          : "—"}
                      </p>
                      {record.note && (
                        <p className="text-xs text-amber-600 mt-0.5">{record.note}</p>
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
    </div>
  );
}
