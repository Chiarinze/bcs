import AdminLayout from "@/components/layouts/AdminLayout";
import MembersList from "@/components/admin/MembersList";
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

  // Fetch filtered members for the current tab
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

  // Fetch counts for all tabs
  const [{ count: totalPending }, { count: totalVerified }, { count: totalAll }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member").eq("is_verified", false),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member").eq("is_verified", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member"),
    ]);

  return (
    <AdminLayout>
      <MembersList
        initialMembers={members}
        initialFilter={filter}
        totalPending={totalPending ?? 0}
        totalVerified={totalVerified ?? 0}
        totalAll={totalAll ?? 0}
      />
    </AdminLayout>
  );
}
