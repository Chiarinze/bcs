import Link from "next/link";
import AdminLayout from "@/components/layouts/AdminLayout";
import { createServerSupabase } from "@/lib/supabaseServer";
import type { AttendanceSession } from "@/types";
import { Calendar, ChevronRight, Clock, User } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export default async function AdminAttendancePage() {
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("attendance_sessions")
    .select(
      "*, taker:profiles!taken_by(first_name, last_name, photo_url), event:events(id, title, slug)"
    )
    .order("session_date", { ascending: false });

  const sessions: AttendanceSession[] = data || [];

  // Group sessions by month
  const grouped = new Map<string, AttendanceSession[]>();
  for (const s of sessions) {
    const monthKey = s.session_date.slice(0, 7); // "2026-04"
    if (!grouped.has(monthKey)) grouped.set(monthKey, []);
    grouped.get(monthKey)!.push(s);
  }

  return (
    <AdminLayout showBack>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <p className="text-sm text-gray-500 mt-1">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <Link
            href="/admin/attendance/reports"
            className="inline-flex items-center gap-2 px-4 py-2 bg-bcs-green text-white text-sm font-medium rounded-xl hover:bg-bcs-green/90 transition"
          >
            Reports
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No attendance sessions recorded yet.</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([monthKey, monthSessions]) => {
            const monthLabel = new Date(monthKey + "-01T00:00:00").toLocaleDateString(
              "en-US",
              { month: "long", year: "numeric" }
            );
            return (
              <div key={monthKey}>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {monthLabel}
                </h2>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                  {monthSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/admin/attendance/${session.id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-bcs-green/10 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-bcs-green uppercase">
                            {formatDay(session.session_date)}
                          </span>
                          <span className="text-lg font-bold text-bcs-green leading-none">
                            {new Date(session.session_date + "T00:00:00").getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {session.title || "Attendance"}
                            </p>
                            {session.has_timestamp && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" />
                                Timestamped
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDate(session.session_date)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {session.taker?.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={session.taker.photo_url}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span className="text-xs text-gray-500 truncate">
                              {session.signature}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-bcs-green transition flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
