import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabaseServer";

/**
 * Verifies that the current request is from an authenticated, verified member (or admin).
 * Returns the user if authorized, or a NextResponse error to return immediately.
 */
export async function requireAuth() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServerSupabase();
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role, is_verified")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  if (profile.role === "admin") {
    return user;
  }

  if (!profile.is_verified) {
    return NextResponse.json({ error: "Account not verified" }, { status: 403 });
  }

  return user;
}
