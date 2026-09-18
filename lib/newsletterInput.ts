import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "a", "img", "h2", "h3", "ul", "ol", "li",
  "blockquote", "hr", "span", "div",
];

/** Keeps the editor's HTML but strips anything that is not plain content. */
export function sanitizeNewsletterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      div: ["style"],
      span: ["style"],
    },
    allowedStyles: {
      "*": { "text-align": [/^(left|center|right)$/] },
    },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}

export interface NewsletterInput {
  subject: string;
  preheader: string | null;
  body_html: string;
  kind: "newsletter" | "promotional";
}

export function parseNewsletterInput(body: Record<string, unknown>): { value?: NewsletterInput; error?: string } {
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";
  if (!subject) return { error: "Subject is required" };

  const preheader =
    typeof body.preheader === "string" && body.preheader.trim()
      ? body.preheader.trim().slice(0, 200)
      : null;

  const kind = body.kind === "promotional" ? "promotional" : "newsletter";
  const body_html = sanitizeNewsletterHtml(typeof body.body_html === "string" ? body.body_html : "");
  if (body_html.length > 200_000) return { error: "Body is too large" };

  return { value: { subject, preheader, body_html, kind } };
}
