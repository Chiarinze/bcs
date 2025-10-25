import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // protect /admin routes with simple password (you can replace this with Supabase Auth later)
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("admin_auth")?.value;
    const adminPassword = process.env.ADMIN_PASS;

    if (!token || token !== adminPassword) {
      const loginUrl = new URL("/admin-login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
