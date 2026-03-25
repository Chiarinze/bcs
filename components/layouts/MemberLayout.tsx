"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  FileText,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import type { Profile } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/articles", label: "Articles", icon: FileText },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function MemberLayout({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/member-login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <Image src={IMAGES.logo} alt="BCS" width={32} height={32} />
              </div>
              <span className="font-semibold text-bcs-green text-sm">
                Member Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photo_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-bcs-green/10 flex items-center justify-center">
                <User className="w-4 h-4 text-bcs-green" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-100 shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:shadow-none lg:z-20 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <Image src={IMAGES.logo} alt="BCS" width={40} height={40} />
                </div>
                <div>
                  <h2 className="font-semibold text-bcs-green text-sm">
                    Member Portal
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Benin Chorale & Philharmonic
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Member Info */}
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-3">
              {profile.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photo_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-bcs-green/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-bcs-green/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-bcs-green" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-[11px] text-gray-400">
                  {profile.membership_status === "full_member"
                    ? "Full Member"
                    : "Probationary Member"}
                </p>
              </div>
            </div>
            {profile.membership_id && (
              <div className="mt-2 px-2 py-1 bg-bcs-green/5 rounded-md">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Membership ID
                </p>
                <p className="text-xs font-mono text-bcs-green font-medium">
                  {profile.membership_id}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-bcs-green text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] ${active ? "text-white" : "text-gray-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
