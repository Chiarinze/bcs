import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---------- Public auth pages (login, signup, reset) ----------
  // Allow unauthenticated access to these pages
  const publicAuthPages = ["/admin-login", "/member-login", "/signup"];
  const isPublicAuthPage = publicAuthPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  if (isPublicAuthPage) {
    // Only redirect admin away from admin-login if already logged in
    if (user && pathname === "/admin-login") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/events";
      return NextResponse.redirect(url);
    }
    // Let member-login and signup pages handle their own redirect logic client-side
    return supabaseResponse;
  }

  // ---------- Protected: /admin routes ----------
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin-login";
      return NextResponse.redirect(url);
    }

    // Verify the user actually has admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      // Non-admin user trying to access admin pages — redirect to member dashboard
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ---------- Protected: /dashboard ----------
  if ((pathname === "/dashboard" || pathname.startsWith("/dashboard/")) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/member-login";
    return NextResponse.redirect(url);
  }

  // ---------- Protected: /profile-setup ----------
  if (pathname === "/profile-setup" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/member-login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
