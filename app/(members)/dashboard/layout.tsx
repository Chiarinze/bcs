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

  return <MemberLayout profile={profile}>{children}</MemberLayout>;
}
