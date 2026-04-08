"use client";

import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { BarChart3, User, Loader2 } from "lucide-react";

interface MemberReport {
  member_id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  present: number;
  absent_with_permission: number;
  absent: number;
  total: number;
}

interface ReportData {
  sessions: number;
  members: MemberReport[];
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AdminAttendanceReportsPage() {
  const [reportType, setReportType] = useState<"monthly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  async function fetchReport() {
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/attendance/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reportType === "monthly"
            ? { type: "monthly", month: selectedMonth }
            : { type: "yearly", year: selectedYear }
        ),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function attendanceRate(m: MemberReport) {
    if (m.total === 0) return 0;
    return Math.round((m.present / m.total) * 100);
  }

  return (
    <AdminLayout showBack>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            View attendance summaries by month or year
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          {/* Report Type Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setReportType("monthly")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                reportType === "monthly"
                  ? "bg-white text-bcs-green shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setReportType("yearly")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                reportType === "yearly"
                  ? "bg-white text-bcs-green shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Yearly
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {reportType === "monthly" ? (
              <>
                <select
                  value={selectedMonth.split("-")[1]}
                  onChange={(e) =>
                    setSelectedMonth(`${selectedMonth.split("-")[0]}-${e.target.value}`)
                  }
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                >
                  {months.map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, "0")}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth.split("-")[0]}
                  onChange={(e) =>
                    setSelectedMonth(`${e.target.value}-${selectedMonth.split("-")[1]}`)
                  }
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={fetchReport}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-bcs-green text-white text-sm font-medium rounded-xl hover:bg-bcs-green/90 transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
              Generate
            </button>
          </div>
        </div>

        {/* Results */}
        {report && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{report.sessions}</span>{" "}
                session{report.sessions !== 1 ? "s" : ""} recorded
                {reportType === "monthly"
                  ? ` in ${months[parseInt(selectedMonth.split("-")[1]) - 1]} ${selectedMonth.split("-")[0]}`
                  : ` in ${selectedYear}`}
              </p>
            </div>

            {report.members.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No attendance data found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                          #
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                          Member
                        </th>
                        <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">
                          Present
                        </th>
                        <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">
                          Excused
                        </th>
                        <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">
                          Absent
                        </th>
                        <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">
                          Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {report.members.map((m, i) => (
                        <tr key={m.member_id} className="hover:bg-gray-50/50 transition">
                          <td className="px-5 py-3 text-sm text-gray-400 w-10">
                            {i + 1}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {m.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={m.photo_url}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-900">
                                {m.first_name} {m.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm font-semibold text-green-600">
                              {m.present}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm font-semibold text-amber-600">
                              {m.absent_with_permission}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm font-semibold text-red-600">
                              {m.absent}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-bcs-green rounded-full"
                                  style={{ width: `${attendanceRate(m)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-600 w-8">
                                {attendanceRate(m)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-2">
                  {report.members.map((m, i) => (
                    <div
                      key={m.member_id}
                      className="bg-white rounded-xl border border-gray-100 p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-gray-400 w-5">
                          {i + 1}
                        </span>
                        {m.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.photo_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {m.first_name} {m.last_name}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-bcs-green rounded-full"
                                style={{ width: `${attendanceRate(m)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-500">
                              {attendanceRate(m)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs pl-8">
                        <span className="text-green-600 font-medium">
                          {m.present} present
                        </span>
                        <span className="text-amber-600 font-medium">
                          {m.absent_with_permission} excused
                        </span>
                        <span className="text-red-600 font-medium">
                          {m.absent} absent
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
