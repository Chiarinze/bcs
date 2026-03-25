import type { RawGrant } from "../sources";
import * as cheerio from "cheerio";

const URL = "https://www.artscouncil.org.uk/ProjectGrants";

export async function fetchArtsCouncilEngland(): Promise<RawGrant[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BCS-GrantScanner/1.0 (beninchoraleandphilharmonic.com)",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const grants: RawGrant[] = [];

    // Look for grant/funding related sections — selectors may need updating
    // if the site changes its structure
    $("h2, h3, .card-title, .listing-item__title, .field--name-title").each(
      (_, el) => {
        const title = $(el).text().trim();
        if (!title || title.length < 10) return;

        const parent = $(el).closest("a, .card, .listing-item, article");
        const link = parent.attr("href") || $(el).find("a").attr("href");
        const description =
          parent.find("p, .card-text, .field--name-body").first().text().trim();

        if (link) {
          const fullUrl = link.startsWith("http")
            ? link
            : `https://www.artscouncil.org.uk${link}`;

          grants.push({
            title,
            description: description?.slice(0, 500),
            external_url: fullUrl,
          });
        }
      }
    );

    return grants.slice(0, 10); // Limit results
  } finally {
    clearTimeout(timeoutId);
  }
}
