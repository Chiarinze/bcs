const HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";

/**
 * Server-side verification of an hCaptcha token.
 * Returns true if the token is valid, false otherwise.
 * Also returns false if HCAPTCHA_SECRET_KEY is not configured.
 */
export async function verifyHCaptcha(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("HCAPTCHA_SECRET_KEY is not set");
    return false;
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch(HCAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data?.success === true;
  } catch {
    return false;
  }
}
