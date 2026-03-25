"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import {
  Home,
  LogOut,
  ChevronLeft,
  Users,
  Heart,
  FileText,
  Award,
  Menu,
  X,
} from "lucide-react";

export default function AdminLayout({
  children,
  showBack = false,
}: {
  children: React.ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isDashboard = pathname === "/admin/events";

  const navLinks = [
    ...(isDashboard
      ? []
      : [{ href: "/admin/events", label: "Dashboard", icon: Home }]),
    { href: "/admin/members", label: "Members", icon: Users },
    { href: "/admin/articles", label: "Articles", icon: FileText },
    { href: "/admin/donations", label: "Donations", icon: Heart },
    { href: "/admin/grants", label: "Grants", icon: Award },
  ];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin-login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-5 h-5 text-bcs-green" />
              </button>
            )}
            <h1 className="text-lg sm:text-xl font-semibold text-bcs-green tracking-tight">
              Admin Dashboard
            </h1>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="outline"
                  className="flex items-center gap-1 border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white"
                >
                  <link.icon className="w-4 h-4" /> {link.label}
                </Button>
              </Link>
            ))}
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white flex items-center gap-1"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-md text-bcs-green hover:bg-gray-100 transition"
          >
            {menuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-bcs-green/10 transition-colors"
              >
                <link.icon className="w-4 h-4 text-bcs-green" />
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-xs py-6">
        © {new Date().getFullYear()} The Benin Chorale & Philharmonic. Admin
        Area.
      </footer>
    </div>
  );
}
