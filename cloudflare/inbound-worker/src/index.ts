/**
 * Cloudflare Email Worker — catch-all handler for the BCS domain.
 *
 *  reply+<uuid>@<domain>  → parsed and POSTed to /api/webhooks/inbound so the
 *                            visitor's reply lands in the admin contact inbox.
 *  anything else          → forwarded to the Gmail inbox, exactly like the
 *                            plain catch-all rule did before.
 *
 * If the webhook rejects or fails, the email is forwarded to Gmail instead,
 * so a reply is never lost.
 */
import PostalMime from "postal-mime";

interface Env {
  SITE_URL: string;
  FALLBACK_TO: string;
  REPLY_DOMAIN: string;
  INBOUND_WEBHOOK_SECRET: string;
}

const REPLY_RE = /^reply\+([0-9a-f-]{36})@/i;

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const to = message.to.toLowerCase();
    const match = to.match(REPLY_RE);

    if (!match || !to.endsWith(`@${env.REPLY_DOMAIN}`)) {
      await message.forward(env.FALLBACK_TO);
      return;
    }

    const messageId = match[1];

    try {
      const raw = await new Response(message.raw).arrayBuffer();
      const parsed = await new PostalMime().parse(raw);

      const text =
        (parsed.text && parsed.text.trim()) ||
        (parsed.html ? htmlToText(parsed.html) : "");

      const res = await fetch(`${env.SITE_URL}/api/webhooks/inbound`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.INBOUND_WEBHOOK_SECRET}`,
          "User-Agent": "bcs-inbound-mail-worker",
        },
        body: JSON.stringify({
          message_id: messageId,
          from: (parsed.from?.address || message.from).toLowerCase(),
          subject: parsed.subject || "",
          text,
          email_message_id: parsed.messageId || null,
        }),
      });

      if (res.ok) return;

      console.warn(`inbound webhook rejected (${res.status}) for ${to}; forwarding instead`);
    } catch (err) {
      console.error("inbound worker error; forwarding instead", err);
    }

    await message.forward(env.FALLBACK_TO);
  },
} satisfies ExportedHandler<Env>;
