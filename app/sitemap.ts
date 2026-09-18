import { MetadataRoute } from "next";
import { createServerSupabase } from "@/lib/supabaseServer";
import { getLeadership } from "@/lib/leadership";

export const revalidate = 3600;

const baseUrl = "https://www.beninchoraleandphilharmonic.com";

type EventRow = { slug: string; created_at: string | null; date: string | null };
type ArticleRow = { slug: string; updated_at: string | null; published_at: string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/performances`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/events`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/articles`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/articles?tab=poetry`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/donate`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];

  let boardRoutes: MetadataRoute.Sitemap = [];
  let eventRoutes: MetadataRoute.Sitemap = [];
  let articleRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServerSupabase();

    const [board, { data: events }, { data: articles }] = await Promise.all([
      getLeadership("executive"),
      supabase
        .from("events")
        .select("slug, created_at, date")
        .eq("is_internal", false)
        .not("slug", "is", null),
      supabase
        .from("articles")
        .select("slug, updated_at, published_at")
        .eq("status", "published"),
    ]);

    boardRoutes = board
      .filter((entry) => entry.profile.slug)
      .map((entry) => ({
        url: `${baseUrl}/about/board/${entry.profile.slug}`,
        lastModified: now,
        changeFrequency: "yearly" as const,
        priority: 0.6,
      }));

    eventRoutes = ((events || []) as EventRow[]).map((e) => ({
      url: `${baseUrl}/events/${e.slug}`,
      lastModified: new Date(e.created_at || e.date || now),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    articleRoutes = ((articles || []) as ArticleRow[]).map((a) => ({
      url: `${baseUrl}/articles/${a.slug}`,
      lastModified: new Date(a.updated_at || a.published_at || now),
      changeFrequency: "monthly",
      priority: 0.7,
    }));
  } catch (err) {
    // A sitemap with only static routes is better than a failed request.
    console.error("sitemap: failed to load dynamic routes", err);
  }

  return [...staticRoutes, ...boardRoutes, ...eventRoutes, ...articleRoutes];
}
