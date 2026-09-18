import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
}

// POST: public contact form. Captcha + a tighter per-IP limit than the
// generic /api rule in middleware. The DB trigger notifies the admins.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limited = rateLimit(ip, { key: "contact", limit: 3, windowSeconds: 600 });
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));

  // Honeypot: real users never fill this hidden field.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ success: true });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40) || null;
  const subject = clean(body.subject, 160);
  const message = clean(body.message, 5000);

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Your message is too short" }, { status: 400 });
  }

  const captchaOk = await verifyHCaptcha(body.hcaptcha_token);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    phone,
    subject,
    message,
    ip_address: ip !== "unknown" ? ip : null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
