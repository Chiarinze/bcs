import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import { User, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

export default async function MemberDashboardPage() {
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

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow">
              <Image
                src={IMAGES.logo}
                alt="BCS logo"
                width={40}
                height={40}
              />
            </div>
            <h1 className="text-lg font-semibold text-bcs-green">
              Member Dashboard
            </h1>
          </div>

          <LogoutButton />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="flex items-center gap-5">
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photo_url}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-bcs-green"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-bcs-green/10 flex items-center justify-center">
                <User className="w-8 h-8 text-bcs-green" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-serif text-bcs-green">
                Welcome, {profile.first_name}!
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {profile.membership_status === "full_member"
                  ? "Full Member"
                  : "Probationary Member"}{" "}
                &middot;{" "}
                {profile.ensemble_arm === "choir"
                  ? `Choir — ${profile.choir_part}`
                  : `Orchestra — ${profile.orchestra_instrument}`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <Link
          href="/dashboard/articles"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center justify-between group hover-lift"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-bcs-green/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-bcs-green" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">My Articles</h3>
              <p className="text-sm text-gray-500">Write and manage your articles</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-bcs-green transition" />
        </Link>

        {/* Profile Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Full Name</span>
              <p className="text-gray-900 font-medium">
                {profile.first_name} {profile.other_name ? `${profile.other_name} ` : ""}{profile.last_name}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Email</span>
              <p className="text-gray-900 font-medium">{profile.email}</p>
            </div>
            <div>
              <span className="text-gray-400">Date of Birth</span>
              <p className="text-gray-900 font-medium">
                {profile.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Address</span>
              <p className="text-gray-900 font-medium">
                {profile.physical_address || "—"}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Ensemble Arm</span>
              <p className="text-gray-900 font-medium capitalize">
                {profile.ensemble_arm || "—"}
              </p>
            </div>
            <div>
              <span className="text-gray-400">
                {profile.ensemble_arm === "choir" ? "Part" : "Instrument"}
              </span>
              <p className="text-gray-900 font-medium">
                {profile.choir_part || profile.orchestra_instrument || "—"}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
