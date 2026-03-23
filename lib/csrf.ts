import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the Origin / Referer header on state-changing requests (POST, PUT, DELETE).
 * Returns a 403 response if the origin doesn't match, or null if the request is safe.
 */
export function validateCsrf(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();

  // Only check state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return null;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // At least one of origin or referer must be present
  const source = origin || (referer ? new URL(referer).origin : null);

  if (!source) {
    // Allow requests with no origin/referer (e.g. server-to-server, cURL in dev)
    // In production you may want to block these too
    return null;
  }

  const host = req.headers.get("host");
  const expectedOrigins = [
    `https://${host}`,
    `http://${host}`,
  ];

  // Also allow the configured base URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl) {
    expectedOrigins.push(new URL(baseUrl).origin);
  }

  if (!expectedOrigins.includes(source)) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin request" },
      { status: 403 }
    );
  }

  return null;
}
