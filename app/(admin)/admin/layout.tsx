import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export default async function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin-login");
  }

  const serviceClient = createServerSupabase();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
