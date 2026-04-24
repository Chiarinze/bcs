"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/layouts/AdminLayout";
import Button from "@/components/ui/Button";
import {
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Search,
  User,
  Calendar,
  Clock,
} from "lucide-react";

interface MemberOption {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  ensemble_arm: string | null;
  choir_part: string | null;
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminAttendanceEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [sessionMeta, setSessionMeta] = useState<{
    session_date: string;
    title: string;
    signature: string;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [hasTimestamp, setHasTimestamp] = useState(false);

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

  useEffect(() => {
    async function load() {
      const [sessionRes, membersRes] = await Promise.all([
        fetch(`/api/attendance/${sessionId}`),
        fetch("/api/members/verified"),
      ]);

      if (!sessionRes.ok) {
        router.replace(`/admin/attendance/${sessionId}`);
        return;
      }

      const sessionData = await sessionRes.json();
      if (!sessionData.canEdit) {
        router.replace(`/admin/attendance/${sessionId}`);
        return;
      }

      const s = sessionData.session;
      setSessionMeta({
        session_date: s.session_date,
        title: s.title,
        signature: s.signature,
      });
      setTitle(s.title || "");
      setHasTimestamp(!!s.has_timestamp);

      const nextPresent = new Map<string, string | null>();
      const nextAbsentPerm = new Map<string, string>();
      for (const r of sessionData.records || []) {
        if (r.status === "present") {
          nextPresent.set(r.member_id, r.marked_at);
        } else if (r.status === "absent_with_permission") {
          nextAbsentPerm.set(r.member_id, r.note || "");
        }
      }
      setPresentMarks(nextPresent);
      setAbsentWithPerm(nextAbsentPerm);

      if (membersRes.ok) setMembers(await membersRes.json());

      setLoading(false);
    }
    load();
  }, [sessionId, router]);

  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
    );
  }, [members, search]);

  function togglePresent(memberId: string) {
    setPresentMarks((prev) => {
      const next = new Map(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.set(memberId, new Date().toISOString());
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

  function getMemberStatus(
    memberId: string
  ): "present" | "absent_with_permission" | "unmarked" {
    if (presentMarks.has(memberId)) return "present";
    if (absentWithPerm.has(memberId)) return "absent_with_permission";
    return "unmarked";
  }

  async function actuallySubmit() {
    if (!title.trim()) {
      alert("Attendance name is required.");
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

    const res = await fetch(`/api/attendance/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        has_timestamp: hasTimestamp,
        present: presentPayload,
        absent_with_permission: absentPayload,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setConfirmOpen(false);
      router.replace(`/admin/attendance/${sessionId}`);
    } else {
      alert(data.error || "Failed to update attendance");
      setSubmitting(false);
    }
  }

  const presentCount = presentMarks.size;
  const excusedCount = absentWithPerm.size;
  const absentCount = Math.max(0, members.length - presentCount - excusedCount);

  if (loading) {
    return (
      <AdminLayout showBack>
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 border-3 border-bcs-green border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout showBack>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Attendance</h1>
          {sessionMeta && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(sessionMeta.session_date + "T00:00:00").toLocaleDateString(
                "en-NG",
                { weekday: "long", year: "numeric", month: "long", day: "numeric" }
              )}
            </p>
          )}
        </div>

        {/* Title + timestamp */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Attendance name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
            />
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

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
          />
        </div>

        {/* Members list */}
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
                    {status === "present" && hasTimestamp && markedAt ? (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Marked at {formatTime(markedAt)}
                      </p>
                    ) : member.choir_part ? (
                      <p className="text-xs text-gray-400">{member.choir_part}</p>
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
        <div className="sticky bottom-4 flex gap-2">
          <button
            onClick={() => router.back()}
            className="px-5 py-3 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            onClick={() => setConfirmOpen(true)}
            className="flex-1 py-3 text-base"
          >
            <ClipboardList className="w-5 h-5 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Save changes to this attendance?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-900">{title}</span>
            </p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Present</span>
                <span className="font-semibold text-green-600">{presentCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Excused</span>
                <span className="font-semibold text-amber-600">{excusedCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Absent</span>
                <span className="font-semibold text-red-500">{absentCount}</span>
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
    </AdminLayout>
  );
}
