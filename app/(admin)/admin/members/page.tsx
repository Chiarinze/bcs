import AdminLayout from "@/components/layouts/AdminLayout";
import MembersList from "@/components/admin/MembersList";
import { Users } from "lucide-react";
import { createServerSupabase } from "@/lib/supabaseServer";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

type FilterType = "pending" | "verified" | "all";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter: FilterType =
    rawFilter === "verified" || rawFilter === "all" ? rawFilter : "pending";

  const supabase = createServerSupabase();

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "member")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_verified", false);
  } else if (filter === "verified") {
    query = query.eq("is_verified", true);
  }

  const { data } = await query;
  const members: Profile[] = data || [];

  return (
    <AdminLayout showBack>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-bcs-green" />
        </div>
        <MembersList initialMembers={members} initialFilter={filter} />
      </div>
    </AdminLayout>
  );
}
