import AdminLayout from "@/components/layouts/AdminLayout";
import { createServerSupabase } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { AttendanceRecord } from "@/types";
import { CheckCircle2, XCircle, AlertCircle, User, Clock, Pencil, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "present") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Present
      </span>
    );
  }
  if (status === "absent_with_permission") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
        <AlertCircle className="w-3 h-3" /> Excused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
      <XCircle className="w-3 h-3" /> Absent
    </span>
  );
}

export default async function AdminAttendanceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select(
      "*, taker:profiles!taken_by(first_name, last_name, photo_url), event:events(id, title, slug)"
    )
    .eq("id", id)
    .single();

  if (!session) notFound();

  const { data: records } = await supabase
    .from("attendance_records")
    .select(
      "*, member:profiles!member_id(id, first_name, last_name, photo_url, ensemble_arm, choir_part)"
    )
    .eq("session_id", id)
    .order("status");

  const allRecords: AttendanceRecord[] = records || [];

  const present = allRecords.filter((r) => r.status === "present");
  const excused = allRecords.filter((r) => r.status === "absent_with_permission");
  const absent = allRecords.filter((r) => r.status === "absent");

  function MemberRow({ record, showTime }: { record: AttendanceRecord; showTime: boolean }) {
    const m = record.member;
    const markedTime =
      showTime && record.status === "present" && record.marked_at
        ? new Date(record.marked_at).toLocaleTimeString("en-NG", {
            hour: "numeric",
            minute: "2-digit",
          })
        : null;

    return (
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 min-w-0">
          {m?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.photo_url}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {m?.first_name} {m?.last_name}
            </p>
            {markedTime ? (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {markedTime}
              </p>
            ) : (
              m?.choir_part && <p className="text-xs text-gray-400">{m.choir_part}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {record.note && (
            <span className="text-xs text-gray-500 italic max-w-[200px] truncate hidden sm:inline">
              {record.note}
            </span>
          )}
          <StatusBadge status={record.status} />
        </div>
      </div>
    );
  }

  const hasTimestamp = !!session.has_timestamp;

  return (
    <AdminLayout showBack>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {session.title || "Attendance"}
              </h1>
              {hasTimestamp && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  Timestamped
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(session.session_date)}
            </p>
            {session.event && (
              <Link
                href={`/events/${session.event.slug}`}
                className="inline-block text-xs text-bcs-green hover:underline mt-1"
              >
                View linked event: {session.event.title}
              </Link>
            )}
            <div className="flex items-center gap-2 mt-2">
              {session.taker?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.taker.photo_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-gray-400" />
              )}
              <p className="text-sm text-gray-500">{session.signature}</p>
            </div>
          </div>
          <Link
            href={`/admin/attendance/${session.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-bcs-green text-white text-sm font-medium rounded-xl hover:bg-bcs-green/90 transition flex-shrink-0"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{present.length}</p>
            <p className="text-xs text-gray-500 mt-1">Present</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{excused.length}</p>
            <p className="text-xs text-gray-500 mt-1">Excused</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{absent.length}</p>
            <p className="text-xs text-gray-500 mt-1">Absent</p>
          </div>
        </div>

        {/* Present */}
        {present.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 bg-green-50/50">
              <h2 className="text-sm font-semibold text-green-800">
                Present ({present.length})
              </h2>
            </div>
            <div className="px-5 divide-y divide-gray-50">
              {present.map((r) => (
                <MemberRow key={r.id} record={r} showTime={hasTimestamp} />
              ))}
            </div>
          </div>
        )}

        {/* Excused */}
        {excused.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 bg-amber-50/50">
              <h2 className="text-sm font-semibold text-amber-800">
                Absent with Permission ({excused.length})
              </h2>
            </div>
            <div className="px-5 divide-y divide-gray-50">
              {excused.map((r) => (
                <MemberRow key={r.id} record={r} showTime={false} />
              ))}
            </div>
          </div>
        )}

        {/* Absent */}
        {absent.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 bg-red-50/50">
              <h2 className="text-sm font-semibold text-red-800">
                Absent ({absent.length})
              </h2>
            </div>
            <div className="px-5 divide-y divide-gray-50">
              {absent.map((r) => (
                <MemberRow key={r.id} record={r} showTime={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
