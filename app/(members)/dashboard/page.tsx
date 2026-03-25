import { createServerSupabase } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Calendar,
  FileText,
  Clock,
  MapPin,
  Megaphone,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MemberDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serverSupabase = createServerSupabase();

  // Fetch internal events (upcoming)
  const { data: eventsData } = await serverSupabase
    .from("events")
    .select("id, title, slug, date, location, event_type, image_url")
    .eq("is_internal", true)
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(5);

  const internalEvents = eventsData || [];

  // Fetch member's recent articles
  const { data: articlesData } = await serverSupabase
    .from("articles")
    .select("id, title, slug, status, updated_at, category")
    .eq("author_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(3);

  const recentArticles = articlesData || [];

  // Fetch published announcements (articles in "Announcements" category)
  const { data: announcementsData } = await serverSupabase
    .from("articles")
    .select("id, title, slug, excerpt, published_at, cover_image_url")
    .eq("status", "published")
    .eq("category", "Announcements")
    .order("published_at", { ascending: false })
    .limit(3);

  const announcements = announcementsData || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-serif text-bcs-green">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back. Here&apos;s what&apos;s happening.
        </p>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Announcements
            </h2>
          </div>
          <div className="space-y-3">
            {announcements.map(
              (a: {
                id: string;
                title: string;
                slug: string;
                excerpt: string | null;
                published_at: string | null;
              }) => (
                <Link
                  key={a.id}
                  href={`/articles/${a.slug}`}
                  className="block bg-amber-50 border border-amber-100 rounded-2xl p-4 hover:bg-amber-100/60 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 group-hover:text-bcs-green transition truncate">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {a.excerpt}
                        </p>
                      )}
                      {a.published_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(a.published_at).toLocaleDateString(
                            "en-NG",
                            { year: "numeric", month: "short", day: "numeric" }
                          )}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  </div>
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* Internal Events */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-bcs-green" />
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming Events
            </h2>
          </div>
        </div>
        {internalEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">
              No upcoming events at the moment.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {internalEvents.map(
              (event: {
                id: string;
                title: string;
                slug: string;
                date: string;
                location?: string;
                event_type?: string;
              }) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition group"
                >
                  <h3 className="font-semibold text-gray-900 group-hover:text-bcs-green transition truncate">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.date).toLocaleDateString("en-NG", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {event.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {event.event_type && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-bcs-green/10 text-bcs-green text-[10px] font-medium uppercase">
                      {event.event_type}
                    </span>
                  )}
                </Link>
              )
            )}
          </div>
        )}
      </section>

      {/* Recent Articles */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-bcs-green" />
            <h2 className="text-lg font-semibold text-gray-900">
              Your Recent Articles
            </h2>
          </div>
          <Link
            href="/dashboard/articles"
            className="text-sm text-bcs-accent hover:underline"
          >
            View all
          </Link>
        </div>
        {recentArticles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm mb-2">
              You haven&apos;t written any articles yet.
            </p>
            <Link
              href="/dashboard/articles/new"
              className="text-sm text-bcs-accent hover:underline"
            >
              Write your first article
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentArticles.map(
              (article: {
                id: string;
                title: string;
                slug: string;
                status: string;
                updated_at: string;
                category: string;
              }) => {
                const statusStyles: Record<string, string> = {
                  draft: "bg-gray-100 text-gray-600",
                  pending_review: "bg-yellow-100 text-yellow-700",
                  published: "bg-green-100 text-green-700",
                };
                const statusLabels: Record<string, string> = {
                  draft: "Draft",
                  pending_review: "Pending Review",
                  published: "Published",
                };
                return (
                  <Link
                    key={article.id}
                    href={
                      article.status === "published"
                        ? `/articles/${article.slug}`
                        : `/dashboard/articles/${article.slug}/edit`
                    }
                    className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition group"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 group-hover:text-bcs-green transition truncate">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>
                          {new Date(article.updated_at).toLocaleDateString(
                            "en-NG",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500">
                          {article.category}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`ml-3 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${
                        statusStyles[article.status] || statusStyles.draft
                      }`}
                    >
                      {statusLabels[article.status] || article.status}
                    </span>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}
