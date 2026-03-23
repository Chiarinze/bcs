import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabaseServer";

/**
 * Verifies that the current request is from an authenticated admin user.
 * Reads the Supabase session from cookies (sent automatically by browser fetch).
 * Returns the user if authorized, or a NextResponse error to return immediately.
 */
export async function requireAdmin() {
  const cookieStore = await cookies();

  // Create a cookie-based client to verify the user's session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // API routes don't need to set cookies
        },
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

  // Use the service role client to check admin role (bypasses RLS)
  const serviceClient = createServerSupabase();
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return user;
}
