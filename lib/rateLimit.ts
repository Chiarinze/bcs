import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Unique key prefix for this limiter (e.g. "login", "signup") */
  key: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * Simple in-memory rate limiter.
 * Returns a 429 NextResponse if the limit is exceeded, or null if allowed.
 *
 * @param identifier - A unique identifier for the client (e.g. IP address or email)
 */
export function rateLimit(
  identifier: string,
  { key, limit, windowSeconds }: RateLimitOptions
): NextResponse | null {
  const bucketKey = `${key}:${identifier}`;
  const now = Date.now();
  const entry = store.get(bucketKey);

  if (!entry || now > entry.resetAt) {
    store.set(bucketKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return null;
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return null;
}

/**
 * Extract client IP from a request.
 * Works with Vercel (x-forwarded-for) and other proxies.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
