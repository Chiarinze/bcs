"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import Button from "@/components/ui/Button";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/member-login");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white flex items-center gap-1"
      onClick={handleLogout}
    >
      <LogOut className="w-4 h-4" /> Logout
    </Button>
  );
}
