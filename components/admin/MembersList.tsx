"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { CheckCircle, XCircle } from "lucide-react";
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

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  function handleFilterChange(f: FilterType) {
    router.push(`/admin/members?filter=${f}`);
  }

  async function handleVerify(
    memberId: string,
    action: "approve" | "reject",
    membershipStatus?: MembershipStatus
  ) {
    if (action === "reject" && !confirm("Are you sure you want to reject and delete this member?")) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-bcs-green">Members</h2>
        </div>

        <div className="flex gap-2">
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
              onApprove={(status) =>
                handleVerify(member.id, "approve", status)
              }
              onReject={() => handleVerify(member.id, "reject")}
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
  onApprove,
  onReject,
  formatDate,
  formatMembershipStatus,
}: {
  member: Profile;
  isLoading: boolean;
  onApprove: (status?: MembershipStatus) => void;
  onReject: () => void;
  formatDate: (date: string) => string;
  formatMembershipStatus: (status: MembershipStatus) => string;
}) {
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus>(
    member.membership_status
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-gray-900">
            {member.first_name} {member.last_name}
          </h3>
          <p className="text-sm text-gray-500">{member.email}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>
              Signed up: {formatDate(member.created_at)}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {formatMembershipStatus(member.membership_status)}
            </span>
            {member.is_verified && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Verified
              </span>
            )}
          </div>
        </div>

        {!member.is_verified && (
          <div className="flex items-center gap-3">
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
      </div>
    </div>
  );
}
