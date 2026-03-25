import type { RawGrant } from "../sources";
import { fetchRSSWithKeywords } from "./rss-utils";

const FEED_URL = "https://opportunitydesk.org/feed/";

const KEYWORDS = [
  "grant",
  "funding",
  "fellowship",
  "scholarship",
  "music",
  "musician",
  "choir",
  "choral",
  "orchestra",
  "arts",
  "creative",
  "culture",
  "performing arts",
  "africa",
  "nigeria",
];

export async function fetchOpportunityDesk(): Promise<RawGrant[]> {
  return fetchRSSWithKeywords(FEED_URL, KEYWORDS);
}
