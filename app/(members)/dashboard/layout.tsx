import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import MemberLayout from "@/components/layouts/MemberLayout";
import type { Profile } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/member-login");
  }

  const serverSupabase = createServerSupabase();
  const { data } = await serverSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = data as Profile | null;

  if (!profile || !profile.profile_completed) {
    redirect("/profile-setup");
  }

  // Check if user holds an executive role
  const { data: executiveRole } = await serverSupabase
    .from("member_roles")
    .select("id")
    .eq("assigned_to", user.id)
    .eq("category", "executive")
    .limit(1)
    .maybeSingle();

  return (
    <MemberLayout profile={profile} isExecutive={!!executiveRole}>
      {children}
    </MemberLayout>
  );
}
