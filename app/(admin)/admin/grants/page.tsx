import AdminLayout from "@/components/layouts/AdminLayout";
import { createServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";
import { Award, Calendar, Sparkles } from "lucide-react";
import type { GrantOpportunity, GrantStatus } from "@/types";
import GrantCard from "./components/GrantCard";

export const dynamic = "force-dynamic";

type FilterType = "all" | "unread" | "interested" | "applied";

export default async function AdminGrantsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter: FilterType =
    rawFilter === "unread" ||
    rawFilter === "interested" ||
    rawFilter === "applied"
      ? rawFilter
      : "all";

  const supabase = createServerSupabase();

  let query = supabase
    .from("grant_opportunities")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data } = await query;
  const grants = (data || []) as GrantOpportunity[];

  // Counts for summary cards
  const { count: totalCount } = await supabase
    .from("grant_opportunities")
    .select("id", { count: "exact", head: true });

  const { count: unreadCount } = await supabase
    .from("grant_opportunities")
    .select("id", { count: "exact", head: true })
    .eq("status", "unread");

  const { count: upcomingDeadlines } = await supabase
    .from("grant_opportunities")
    .select("id", { count: "exact", head: true })
    .gte("deadline", new Date().toISOString());

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", count: unreadCount || 0 },
    { key: "interested", label: "Interested" },
    { key: "applied", label: "Applied" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-serif text-bcs-green flex items-center gap-2">
            <Award className="w-6 h-6" /> Grant Opportunities
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Funding opportunities for musicians, music organisations, and
            creatives
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500">Total Opportunities</p>
            <p className="text-3xl font-bold text-bcs-green mt-1">
              {totalCount || 0}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-gray-500">Unread</p>
            </div>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {unreadCount || 0}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-yellow-500" />
              <p className="text-sm text-gray-500">With Deadlines</p>
            </div>
            <p className="text-3xl font-bold text-yellow-600 mt-1">
              {upcomingDeadlines || 0}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={`/admin/grants?filter=${f.key}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition inline-flex items-center gap-1.5 ${
                filter === f.key
                  ? "bg-bcs-green text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    filter === f.key
                      ? "bg-white/20 text-white"
                      : "bg-blue-200 text-blue-800"
                  }`}
                >
                  {f.count}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Grants List */}
        {grants.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No grant opportunities found.</p>
            <p className="text-gray-400 text-sm mt-1">
              The scanner checks for new opportunities daily.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grants.map((grant) => (
              <GrantCard key={grant.id} grant={grant} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
