import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "The Benin Chorale & Philharmonic <noreply@beninchoraleandphilharmonic.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beninchoraleandphilharmonic.com";
const LOGO_URL = `${SITE_URL}/icon.jpeg`;

export async function sendApprovalEmail({
  to,
  firstName,
  membershipStatus,
}: {
  to: string;
  firstName: string;
  membershipStatus: string;
}) {
  const statusLabel =
    membershipStatus === "full_member" ? "Full Member" : "Probationary Member";

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your BCS Membership Has Been Approved!",
    html: `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <img
            src="${LOGO_URL}"
            alt="The Benin Chorale &amp; Philharmonic"
            width="80"
            height="80"
            style="border-radius: 50%; margin-bottom: 16px;"
          />
          <h1 style="color: #1a5632; font-size: 24px; margin: 0;">
            The Benin Chorale &amp; Philharmonic
          </h1>
        </div>

        <div style="background: #f9f9f7; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">
          <h2 style="color: #1a5632; font-size: 20px; margin: 0 0 16px;">
            Welcome aboard, ${firstName}!
          </h2>

          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            Great news! Your membership registration has been reviewed and
            <strong>approved</strong>. You have been registered as a
            <strong>${statusLabel}</strong>.
          </p>

          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            You can now log in to your member dashboard to view your profile,
            access internal events, and write articles.
          </p>

          <div style="text-align: center;">
            <a
              href="${SITE_URL}/member-login"
              style="display: inline-block; background: #1a5632; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;"
            >
              Log In to Your Dashboard
            </a>
          </div>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
          &copy; ${new Date().getFullYear()} The Benin Chorale &amp; Philharmonic Society.
          All rights reserved.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send approval email:", error);
    throw error;
  }
}
