"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Home, LogOut, ChevronLeft } from "lucide-react";

export default function AdminLayout({
  children,
  showBack = false,
}: {
  children: React.ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === "/admin/events";

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

          <div className="flex items-center gap-2">
            {!isDashboard && (
              <Link href="/admin/events">
                <Button
                  variant="outline"
                  className="flex items-center gap-1 border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white"
                >
                  <Home className="w-4 h-4" /> Dashboard
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white flex items-center gap-1"
              onClick={() => router.push("/")}
            >
              <LogOut className="w-4 h-4" /> Exit Admin
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-xs py-6">
        © {new Date().getFullYear()} The Benin Chorale & Philharmonic. Admin Area.
      </footer>
    </div>
  );
}
