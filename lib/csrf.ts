import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the Origin / Referer header on state-changing requests.
 * Returns a 403 response if the origin doesn't match, or null if the request is safe.
 *
 * Non-browser callers (no Origin and no Referer) are allowed: they can't carry a
 * victim's session cookies, so they aren't a CSRF vector.
 */
export function validateCsrf(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return null;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  let source: string | null = null;
  if (origin) {
    source = origin;
  } else if (referer) {
    try {
      source = new URL(referer).origin;
    } catch {
      return NextResponse.json(
        { error: "Forbidden: invalid referer" },
        { status: 403 }
      );
    }
  }

  if (!source) {
    // No Origin and no Referer → not a browser, so no cookie-bound CSRF risk.
    return null;
  }

  // Build the expected-origin list. Prefer the explicitly configured base URL —
  // never the request's Host header alone, which an attacker can spoof when the
  // app isn't behind a trusted, header-pinning proxy.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const expectedOrigins = new Set<string>();

  if (baseUrl) {
    try {
      expectedOrigins.add(new URL(baseUrl).origin);
    } catch {
      // Misconfigured env var — fall through to host fallback below.
    }
  }

  if (expectedOrigins.size === 0) {
    // Dev fallback: trust the Host header only when no base URL is configured.
    // In production, always set NEXT_PUBLIC_BASE_URL so this branch is dead code.
    const host = req.headers.get("host");
    if (host) {
      expectedOrigins.add(`https://${host}`);
      expectedOrigins.add(`http://${host}`);
    }
  }

  if (!expectedOrigins.has(source)) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin request" },
      { status: 403 }
    );
  }

  return null;
}
