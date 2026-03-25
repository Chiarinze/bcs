"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { CheckCircle, XCircle, ArrowUpCircle } from "lucide-react";
import type { Profile, MembershipStatus } from "@/types";

type FilterType = "pending" | "verified" | "all";

export default function MembersList({
  initialMembers,
  initialFilter,
}: {
  initialMembers: Profile[];
  initialFilter: FilterType;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Profile[]>(initialMembers);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedForPromotion, setSelectedForPromotion] = useState<Set<string>>(
    new Set()
  );
  const [bulkYear, setBulkYear] = useState("");
  const [promoteYear, setPromoteYear] = useState<Record<string, string>>({});

  useEffect(() => {
    setMembers(initialMembers);
    setSelectedForPromotion(new Set());
  }, [initialMembers]);

  function handleFilterChange(f: FilterType) {
    router.push(`/admin/members?filter=${f}`);
  }

  async function handleVerify(
    memberId: string,
    action: "approve" | "reject",
    membershipStatus?: MembershipStatus
  ) {
    if (
      action === "reject" &&
      !confirm("Are you sure you want to reject and delete this member?")
    ) {
      return;
    }

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
        `Promote ${selectedForPromotion.size} member(s) to Full Member with induction year ${bulkYear}?`
      )
    ) {
      return;
    }

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
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }

  // Members eligible for bulk promotion: verified, probationary, no membership_id
  const promotableMembers = members.filter(
    (m) =>
      m.is_verified &&
      m.membership_status === "probationary" &&
      !m.membership_id
  );

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatMembershipStatus(status: MembershipStatus): string {
    return status === "full_member" ? "Full Member" : "Probationary";
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-bcs-green">Members</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["pending", "verified", "all"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                initialFilter === f
                  ? "bg-bcs-green text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "pending"
                ? "Pending"
                : f === "verified"
                ? "Verified"
                : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Promotion Bar */}
      {promotableMembers.length > 0 && initialFilter !== "pending" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Bulk Promote to Full Member
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    selectedForPromotion.size === promotableMembers.length &&
                    promotableMembers.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForPromotion(
                        new Set(promotableMembers.map((m) => m.id))
                      );
                    } else {
                      setSelectedForPromotion(new Set());
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-amber-700">Select All ({promotableMembers.length})</span>
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
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white w-36"
                  />
                  <Button
                    variant="primary"
                    loading={bulkLoading}
                    onClick={handleBulkPromote}
                    className="text-sm"
                  >
                    Promote {selectedForPromotion.size} member(s)
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500">
            No {initialFilter === "all" ? "" : initialFilter} members found.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.map((member) => (
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
              formatDate={formatDate}
              formatMembershipStatus={formatMembershipStatus}
            />
          ))}
        </div>
      )}
    </>
  );
}

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
  formatDate,
  formatMembershipStatus,
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
  formatDate: (date: string) => string;
  formatMembershipStatus: (status: MembershipStatus) => string;
}) {
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus>(
    member.membership_status
  );

  // Can this member be promoted? (verified, probationary, no membership_id)
  const canPromote =
    member.is_verified &&
    member.membership_status === "probationary" &&
    !member.membership_id;

  // Is this member's status locked? (verified full member)
  const isStatusLocked =
    member.is_verified && member.membership_status === "full_member";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Promotion checkbox for eligible members */}
            {canPromote && (
              <input
                type="checkbox"
                checked={isSelectedForPromotion}
                onChange={onTogglePromoSelection}
                className="rounded border-gray-300 mt-1"
              />
            )}
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900">
                {member.first_name} {member.last_name}
              </h3>
              <p className="text-sm text-gray-500">{member.email}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>Signed up: {formatDate(member.created_at)}</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {formatMembershipStatus(member.membership_status)}
                </span>
                {member.is_verified && (
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Verified
                  </span>
                )}
                {member.membership_id && (
                  <span className="px-2 py-0.5 rounded-full bg-bcs-green/10 text-bcs-green font-mono">
                    {member.membership_id}
                  </span>
                )}
                {isStatusLocked && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px]">
                    Status Locked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verification actions (for pending members) */}
        {!member.is_verified && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50">
            {/* Only allow downgrade: if member is full_member, show option to change to probationary */}
            {member.membership_status === "full_member" && (
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as MembershipStatus)
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="full_member">Full Member</option>
                <option value="probationary">Probationary</option>
              </select>
            )}

            <Button
              variant="primary"
              loading={isLoading}
              onClick={() => onApprove(selectedStatus)}
              className="flex items-center gap-1 text-sm"
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </Button>

            <Button
              variant="danger"
              loading={isLoading}
              onClick={onReject}
              className="flex items-center gap-1 text-sm"
            >
              <XCircle className="w-4 h-4" /> Reject
            </Button>
          </div>
        )}

        {/* Promote action (for verified probationary members) */}
        {canPromote && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50">
            <span className="text-sm text-gray-500">Promote to Full Member:</span>
            <input
              type="number"
              min="2012"
              max={new Date().getFullYear()}
              value={promoteYear}
              onChange={(e) => onPromoteYearChange(e.target.value)}
              placeholder="Induction year"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white w-36"
            />
            <Button
              variant="primary"
              loading={isLoading}
              onClick={onPromote}
              className="flex items-center gap-1 text-sm"
            >
              <ArrowUpCircle className="w-4 h-4" /> Promote
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
