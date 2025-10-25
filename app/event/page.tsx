import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { Event } from "@/types";
import EventImage from "@/components/common/EventImage";

export const revalidate = 60;

export const metadata = {
  title: "Events | The Benin Chorale & Philharmonic",
  description:
    "Discover upcoming concerts, performances, and events by The Benin Chorale & Philharmonic.",
};

export default async function EventsPage() {
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error.message);
    return (
      <div className="py-20 text-center text-gray-600">
        <p>Failed to load events. Please try again later.</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-20 text-center text-gray-600">
        <p>No upcoming events at the moment. Please check back soon!</p>
      </div>
    );
  }

  return (
    <section className="py-20 bg-[#F9F9F7]">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-serif text-center mb-14 text-bcs-green">
          Upcoming Events
        </h1>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: Event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="card-hover flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition"
            >
              {/* Image Section */}
              <div className="relative w-full h-60">
                <span className="absolute top-3 left-3 z-10 bg-bcs-green text-white text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                  {event.is_paid ? "Paid" : "Free"}
                </span>

                <EventImage
                  src={event.image_url}
                  alt={event.title}
                  blurData={event.image_blur_data}
                  className="rounded-t-2xl"
                />
              </div>

              {/* Event Info */}
              <div className="flex flex-col flex-1 p-6">
                <h2 className="text-xl font-semibold mb-2 text-bcs-green">
                  {event.title}
                </h2>
                <p className="text-gray-600 mb-3 line-clamp-3">
                  {event.description}
                </p>

                <div className="text-sm text-gray-500 mt-auto">
                  <p>{format(new Date(event.date), "MMMM d, yyyy")}</p>
                  {event.location && <p>{event.location}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
