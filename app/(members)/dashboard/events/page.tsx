import { createServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { Event } from "@/types";

export const dynamic = "force-dynamic";

export default async function MemberEventsPage() {
  const supabase = createServerSupabase();

  const now = new Date().toISOString();

  const [{ data: upcomingData }, { data: pastData }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("is_internal", true)
      .gte("date", now)
      .order("date", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("is_internal", true)
      .lt("date", now)
      .order("date", { ascending: false }),
  ]);

  const upcoming = (upcomingData || []) as Event[];
  const past = (pastData || []) as Event[];

  function EventCard({ event, isPast }: { event: Event; isPast?: boolean }) {
    return (
      <Link
        href={`/dashboard/events/${event.slug}`}
        className={`block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition group ${
          isPast ? "opacity-75" : ""
        }`}
      >
        {event.image_url && (
          <div className="aspect-[16/9] relative bg-gray-100">
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 50vw"
              {...(event.image_blur_data
                ? { placeholder: "blur", blurDataURL: event.image_blur_data }
                : {})}
            />
            {event.event_type && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-bcs-green text-white text-[10px] font-medium uppercase">
                {event.event_type}
              </span>
            )}
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-bcs-green transition line-clamp-2">
            {event.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(event.date).toLocaleDateString("en-NG", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {event.end_date && new Date(event.end_date).toDateString() !== new Date(event.date).toDateString() && (
                <span>
                  {" — "}
                  {new Date(event.end_date).toLocaleDateString("en-NG", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif text-bcs-green">Events</h1>
        <p className="text-sm text-gray-500 mt-1">
          Internal events for members.
        </p>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upcoming Events
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">
              No upcoming events at the moment.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-500 mb-4">
            Past Events
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((event) => (
              <EventCard key={event.id} event={event} isPast />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
