"use client";

import { useState } from "react";
import { ClipboardList, CalendarDays, ListChecks, Download } from "lucide-react";
import IssueQueriesTab from "./IssueQueriesTab";
import ScheduleTab from "./ScheduleTab";
import ScoringTab from "./ScoringTab";

type Tab = "queries" | "schedule" | "scoring";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "queries", label: "Queries", icon: ClipboardList },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "scoring", label: "Scoring", icon: ListChecks },
];

export default function AdminRecitalClient() {
  const [tab, setTab] = useState<Tab>("queries");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compulsory Recital</h1>
          <p className="text-sm text-gray-500 mt-1">
            Issue queries, manage the Friday schedule, and record performance scores.
          </p>
        </div>
        <a
          href="/api/admin/recital/download"
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white transition"
        >
          <Download className="w-4 h-4" /> Download roster (PDF)
        </a>
      </div>

      <div className="flex gap-1 bg-white rounded-2xl p-1 border border-gray-100 w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              tab === t.id
                ? "bg-bcs-green text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "queries" && <IssueQueriesTab />}
      {tab === "schedule" && <ScheduleTab />}
      {tab === "scoring" && <ScoringTab />}
    </div>
  );
}
