"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  Users,
  Clock,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";
import type { Profile, MembershipStatus } from "@/types";

type FilterType = "pending" | "verified" | "all";

const PAGE_SIZE = 10;

export default function MembersList({
  initialMembers,
  initialFilter,
  totalPending,
  totalVerified,
  totalAll,
}: {
  initialMembers: Profile[];
  initialFilter: FilterType;
  totalPending: number;
  totalVerified: number;
  totalAll: number;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Profile[]>(initialMembers);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedForPromotion, setSelectedForPromotion] = useState<Set<string>>(
    new Set(),
  );
  const [bulkYear, setBulkYear] = useState("");
  const [promoteYear, setPromoteYear] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  useEffect(() => {
    setMembers(initialMembers);
    setSelectedForPromotion(new Set());
    setPage(1);
  }, [initialMembers]);

  const totalPages = Math.ceil(members.length / PAGE_SIZE);
  const paginated = members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(f: FilterType) {
    router.push(`/admin/members?filter=${f}`);
  }

  async function handleVerify(
    memberId: string,
    action: "approve" | "reject",
    membershipStatus?: MembershipStatus,
  ) {
    if (
      action === "reject" &&
      !confirm("Are you sure you want to reject and delete this member?")
    )
      return;

    setActionLoading(memberId);

    const res = await fetch("/api/members/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: memberId,
        action,
        membership_status: membershipStatus,
      }),
    });

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Action failed");
    }

    setActionLoading(null);
  }

  async function handlePromote(memberId: string) {
    const year = promoteYear[memberId];
    if (!year) {
      alert("Please enter the induction year");
      return;
    }

    setActionLoading(memberId);

    const res = await fetch("/api/members/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_ids: [memberId],
        year_inducted: parseInt(year),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      router.refresh();
    } else {
      alert(data.error || "Promotion failed");
    }

    setActionLoading(null);
  }

  async function handleBulkPromote() {
    if (selectedForPromotion.size === 0) {
      alert("Please select members to promote");
      return;
    }
    if (!bulkYear) {
      alert("Please enter the induction year");
      return;
    }
    if (
      !confirm(
        `Promote ${selectedForPromotion.size} member(s) to Full Member with induction year ${bulkYear}?`,
      )
    )
      return;

    setBulkLoading(true);

    const res = await fetch("/api/members/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_ids: Array.from(selectedForPromotion),
        year_inducted: parseInt(bulkYear),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      alert(`Successfully promoted ${data.promoted} member(s)`);
      setSelectedForPromotion(new Set());
      setBulkYear("");
      router.refresh();
    } else {
      alert(data.error || "Bulk promotion failed");
    }

    setBulkLoading(false);
  }

  function togglePromoSelection(memberId: string) {
    setSelectedForPromotion((prev) => {
      const next = new Set(prev);
      next.has(memberId) ? next.delete(memberId) : next.add(memberId);
      return next;
    });
  }

  const promotableMembers = members.filter(
    (m) =>
      m.is_verified &&
      m.membership_status === "probationary" &&
      !m.membership_id,
  );

  function formatYearJoined(member: Profile): string {
    if (member.membership_status === "full_member" && member.year_inducted) {
      return String(member.year_inducted);
    }
    return "—";
  }

  const stats = [
    {
      label: "Total Members",
      value: totalAll,
      icon: Users,
      color: "text-gray-700",
      bg: "bg-gray-50",
    },
    {
      label: "Pending Verification",
      value: totalPending,
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Verified Members",
      value: totalVerified,
      icon: BadgeCheck,
      color: "text-green-700",
      bg: "bg-green-50",
    },
  ];

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: totalPending },
    { key: "verified", label: "Verified", count: totalVerified },
    { key: "all", label: "All Members", count: totalAll },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Members
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage and verify ensemble membership applications
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-xl border border-gray-100 p-4 flex items-center gap-4`}
          >
            <div className="flex-shrink-0">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className={`text-xs font-medium ${stat.color}`}>
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              initialFilter === tab.key
                ? "border-bcs-green text-bcs-green"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                initialFilter === tab.key
                  ? "bg-bcs-green/10 text-bcs-green"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Promotion Bar */}
      {promotableMembers.length > 0 && initialFilter !== "pending" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ArrowUpCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              Bulk Promote
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  selectedForPromotion.size === promotableMembers.length &&
                  promotableMembers.length > 0
                }
                onChange={(e) => {
                  setSelectedForPromotion(
                    e.target.checked
                      ? new Set(promotableMembers.map((m) => m.id))
                      : new Set(),
                  );
                }}
                className="rounded border-gray-300 accent-bcs-green"
              />
              <span className="text-xs text-amber-700">
                Select all eligible ({promotableMembers.length})
              </span>
            </label>
            {selectedForPromotion.size > 0 && (
              <>
                <input
                  type="number"
                  min="2012"
                  max={new Date().getFullYear()}
                  value={bulkYear}
                  onChange={(e) => setBulkYear(e.target.value)}
                  placeholder="Induction year"
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                />
                <Button
                  variant="primary"
                  loading={bulkLoading}
                  onClick={handleBulkPromote}
                  className="text-sm"
                >
                  Promote {selectedForPromotion.size} selected
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {members.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            No {initialFilter === "all" ? "" : initialFilter} members found.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            They will appear here once registered.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {promotableMembers.length > 0 &&
                    initialFilter !== "pending" && (
                      <th className="w-10 px-4 py-3"></th>
                    )}
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Member
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Membership ID
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Year Joined
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isLoading={actionLoading === member.id}
                    isSelectedForPromotion={selectedForPromotion.has(member.id)}
                    onTogglePromoSelection={() =>
                      togglePromoSelection(member.id)
                    }
                    onApprove={(status) =>
                      handleVerify(member.id, "approve", status)
                    }
                    onReject={() => handleVerify(member.id, "reject")}
                    onPromote={() => handlePromote(member.id)}
                    promoteYear={promoteYear[member.id] || ""}
                    onPromoteYearChange={(y) =>
                      setPromoteYear((prev) => ({ ...prev, [member.id]: y }))
                    }
                    showCheckbox={
                      promotableMembers.length > 0 &&
                      initialFilter !== "pending"
                    }
                    yearJoined={formatYearJoined(member)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginated.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                isLoading={actionLoading === member.id}
                isSelectedForPromotion={selectedForPromotion.has(member.id)}
                onTogglePromoSelection={() => togglePromoSelection(member.id)}
                onApprove={(status) =>
                  handleVerify(member.id, "approve", status)
                }
                onReject={() => handleVerify(member.id, "reject")}
                onPromote={() => handlePromote(member.id)}
                promoteYear={promoteYear[member.id] || ""}
                onPromoteYearChange={(y) =>
                  setPromoteYear((prev) => ({ ...prev, [member.id]: y }))
                }
                isExpanded={expandedMember === member.id}
                onToggleExpand={() =>
                  setExpandedMember(
                    expandedMember === member.id ? null : member.id,
                  )
                }
                showCheckbox={
                  promotableMembers.length > 0 && initialFilter !== "pending"
                }
                yearJoined={formatYearJoined(member)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-800">
                  {(page - 1) * PAGE_SIZE + 1}
                </span>
                –
                <span className="font-medium text-gray-800">
                  {Math.min(page * PAGE_SIZE, members.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-800">
                  {members.length}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                        page === p
                          ? "bg-bcs-green text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Desktop Table Row ─── */
function MemberRow({
  member,
  isLoading,
  isSelectedForPromotion,
  onTogglePromoSelection,
  onApprove,
  onReject,
  onPromote,
  promoteYear,
  onPromoteYearChange,
  showCheckbox,
  yearJoined,
}: {
  member: Profile;
  isLoading: boolean;
  isSelectedForPromotion: boolean;
  onTogglePromoSelection: () => void;
  onApprove: (status?: MembershipStatus) => void;
  onReject: () => void;
  onPromote: () => void;
  promoteYear: string;
  onPromoteYearChange: (year: string) => void;
  showCheckbox: boolean;
  yearJoined: string;
}) {
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus>(
    member.membership_status,
  );

  const canPromote =
    member.is_verified &&
    member.membership_status === "probationary" &&
    !member.membership_id;
  const isStatusLocked =
    member.is_verified && member.membership_status === "full_member";

  const initials =
    `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();

  return (
    <tr className="hover:bg-gray-50/60 transition-colors group">
      {showCheckbox && (
        <td className="px-4 py-4">
          {canPromote && (
            <input
              type="checkbox"
              checked={isSelectedForPromotion}
              onChange={onTogglePromoSelection}
              className="rounded border-gray-300 accent-bcs-green"
            />
          )}
        </td>
      )}

      {/* Member Info */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bcs-green/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-bcs-green">{initials}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {member.first_name} {member.last_name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <div className="flex flex-col gap-1">
          <StatusBadge status={member.membership_status} />
          {member.is_verified && (
            <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium">
              <BadgeCheck className="w-3 h-3" /> Verified
            </span>
          )}
          {isStatusLocked && (
            <span className="text-[10px] text-blue-500">Status Locked</span>
          )}
        </div>
      </td>

      {/* Membership ID */}
      <td className="px-5 py-4">
        {member.membership_id ? (
          <span className="font-mono text-xs bg-bcs-green/10 text-bcs-green px-2 py-1 rounded-md">
            {member.membership_id}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Year Joined */}
      <td className="px-5 py-4 text-sm text-gray-500">{yearJoined}</td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          {!member.is_verified && (
            <>
              {member.membership_status === "full_member" && (
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as MembershipStatus)
                  }
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                >
                  <option value="full_member">Full Member</option>
                  <option value="probationary">Probationary</option>
                </select>
              )}
              <button
                disabled={isLoading}
                onClick={() => onApprove(selectedStatus)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                disabled={isLoading}
                onClick={onReject}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}

          {canPromote && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="2012"
                max={new Date().getFullYear()}
                value={promoteYear}
                onChange={(e) => onPromoteYearChange(e.target.value)}
                placeholder="Year"
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white w-20 focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
              />
              <button
                disabled={isLoading}
                onClick={onPromote}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bcs-green/10 text-bcs-green text-xs font-medium hover:bg-bcs-green/20 disabled:opacity-50 transition"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" /> Promote
              </button>
            </div>
          )}

          {isStatusLocked && (
            <span className="text-xs text-gray-400 italic">
              No actions available
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─── Mobile Card ─── */
function MemberCard({
  member,
  isLoading,
  isSelectedForPromotion,
  onTogglePromoSelection,
  onApprove,
  onReject,
  onPromote,
  promoteYear,
  onPromoteYearChange,
  isExpanded,
  onToggleExpand,
  showCheckbox,
  yearJoined,
}: {
  member: Profile;
  isLoading: boolean;
  isSelectedForPromotion: boolean;
  onTogglePromoSelection: () => void;
  onApprove: (status?: MembershipStatus) => void;
  onReject: () => void;
  onPromote: () => void;
  promoteYear: string;
  onPromoteYearChange: (year: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showCheckbox: boolean;
  yearJoined: string;
}) {
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus>(
    member.membership_status,
  );
  const canPromote =
    member.is_verified &&
    member.membership_status === "probationary" &&
    !member.membership_id;
  const hasActions = !member.is_verified || canPromote;
  const initials =
    `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {showCheckbox && canPromote && (
          <input
            type="checkbox"
            checked={isSelectedForPromotion}
            onChange={onTogglePromoSelection}
            className="rounded border-gray-300 accent-bcs-green flex-shrink-0"
          />
        )}
        <div className="w-9 h-9 rounded-full bg-bcs-green/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-bcs-green">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {member.first_name} {member.last_name}
          </p>
          <p className="text-xs text-gray-400 truncate">{member.email}</p>
        </div>
        {hasActions && (
          <button
            onClick={onToggleExpand}
            className="p-1 text-gray-400 hover:text-gray-600 transition"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <StatusBadge status={member.membership_status} />
        {member.is_verified && (
          <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
            <BadgeCheck className="w-3 h-3" /> Verified
          </span>
        )}
        {member.membership_id && (
          <span className="font-mono text-[11px] bg-bcs-green/10 text-bcs-green px-2 py-0.5 rounded-md">
            {member.membership_id}
          </span>
        )}
        <span className="text-[11px] text-gray-400">
          {yearJoined !== "—" ? `Inducted ${yearJoined}` : "Pending induction"}
        </span>
      </div>

      {/* Expandable Actions */}
      {isExpanded && hasActions && (
        <div className="border-t border-gray-50 px-4 py-3 bg-gray-50/50 space-y-3">
          {!member.is_verified && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Verification
              </p>
              {member.membership_status === "full_member" && (
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as MembershipStatus)
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                >
                  <option value="full_member">Full Member</option>
                  <option value="probationary">Probationary</option>
                </select>
              )}
              <div className="flex gap-2">
                <button
                  disabled={isLoading}
                  onClick={() => onApprove(selectedStatus)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 disabled:opacity-50 transition"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  disabled={isLoading}
                  onClick={onReject}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          )}

          {canPromote && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Promote to Full Member
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="2012"
                  max={new Date().getFullYear()}
                  value={promoteYear}
                  onChange={(e) => onPromoteYearChange(e.target.value)}
                  placeholder="Induction year"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bcs-green/30"
                />
                <button
                  disabled={isLoading}
                  onClick={onPromote}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bcs-green/10 text-bcs-green text-sm font-medium hover:bg-bcs-green/20 disabled:opacity-50 transition"
                >
                  <ArrowUpCircle className="w-4 h-4" /> Promote
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: MembershipStatus }) {
  const isFullMember = status === "full_member";
  return (
    <span
      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        isFullMember ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {isFullMember ? "Full Member" : "Probationary"}
    </span>
  );
}
