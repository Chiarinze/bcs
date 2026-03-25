import type { GrantStatus } from "@/types";

const styles: Record<GrantStatus, string> = {
  unread: "bg-blue-100 text-blue-700",
  read: "bg-gray-100 text-gray-600",
  interested: "bg-yellow-100 text-yellow-700",
  applied: "bg-green-100 text-green-700",
};

const labels: Record<GrantStatus, string> = {
  unread: "Unread",
  read: "Read",
  interested: "Interested",
  applied: "Applied",
};

export default function GrantStatusBadge({ status }: { status: GrantStatus }) {
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
