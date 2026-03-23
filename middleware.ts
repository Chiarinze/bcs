import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { validateCsrf } from "@/lib/csrf";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // CSRF protection for all API state-changing requests
  if (pathname.startsWith("/api/")) {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    // Rate limit public API POST endpoints
    if (request.method === "POST") {
      const limited = rateLimit(getClientIp(request.headers), {
        key: `api:${pathname}`,
        limit: 15,
        windowSeconds: 60,
      });
      if (limited) return limited;
    }

    return NextResponse.next();
  }

  // Rate limit auth pages (login, signup) — slows automated brute-force form submissions
  const authPages = ["/admin-login", "/member-login", "/signup"];
  const isAuthPage = authPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
  if (isAuthPage && request.method === "POST") {
    const limited = rateLimit(getClientIp(request.headers), {
      key: "auth-page",
      limit: 10,
      windowSeconds: 300,
    });
    if (limited) return limited;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/admin-login/:path*",
    "/admin-login",
    "/member-login/:path*",
    "/member-login",
    "/signup",
    "/profile-setup",
    "/dashboard",
    "/dashboard/:path*",
  ],
};
