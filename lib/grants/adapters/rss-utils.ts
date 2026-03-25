import type { RawGrant } from "../sources";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

/**
 * Minimal RSS/Atom XML parser using regex.
 * Avoids adding an RSS library dependency.
 */
function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const description = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");

    if (title && link) {
      items.push({ title, link, description: description || "", pubDate });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRegex = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = regex.exec(xml);
  return match ? match[1].trim() : "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

/**
 * Fetches an RSS feed and filters items by keywords.
 * Returns matching items as RawGrant objects.
 */
export async function fetchRSSWithKeywords(
  feedUrl: string,
  keywords: string[],
  options?: { timeout?: number }
): Promise<RawGrant[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options?.timeout || 8000
  );

  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BCS-GrantScanner/1.0 (beninchoraleandphilharmonic.com)",
      },
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const items = parseRSSItems(xml);
    const lowerKeywords = keywords.map((k) => k.toLowerCase());

    return items
      .filter((item) => {
        const text =
          `${item.title} ${item.description}`.toLowerCase();
        return lowerKeywords.some((kw) => text.includes(kw));
      })
      .map((item) => ({
        title: stripHtml(item.title),
        description: stripHtml(item.description).slice(0, 500),
        external_url: item.link,
      }));
  } finally {
    clearTimeout(timeoutId);
  }
}
