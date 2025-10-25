"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import EventImage from "../common/EventImage";
import Button from "@/components/ui/Button";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  slug: string;
  location: string;
  image_url?: string | null;
  image_blur_data?: string | null;
  is_paid: boolean;
  price?: number | null;
}

export default function EventDashboard({ events }: { events: Event[] }) {
  const router = useRouter();
  const [revalidating, setRevalidating] = useState(false);

  async function handleRevalidate() {
    setRevalidating(true);
    try {
      const res = await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "/events",
          adminKey: process.env.NEXT_PUBLIC_ADMIN_PASS,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to revalidate");

      alert("✅ Events page successfully revalidated!");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRevalidating(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-serif text-bcs-green">Manage Events</h1>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/admin/events/new")}
            className="bg-bcs-green hover:bg-bcs-accent"
          >
            + New Event
          </Button>
          <Button
            onClick={handleRevalidate}
            disabled={revalidating}
            variant="outline"
            className="border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white"
          >
            {revalidating ? "Revalidating..." : "↻ Revalidate Events"}
          </Button>
        </div>
      </div>

      {/* Event Grid */}
      {events.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-gray-100">
          <p>No events found yet.</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => router.push(`/admin/events/${event.slug}`)}
              className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
            >
              {/* Image */}
              <div className="relative w-full h-56">
                <span className="absolute top-3 left-3 z-10 bg-bcs-green text-white text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                  {event.is_paid ? "Paid" : "Free"}
                </span>
                <EventImage
                  src={event.image_url}
                  alt={event.title}
                  blurData={event.image_blur_data}
                />
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col justify-between min-h-[200px]">
                <div>
                  <h2 className="font-semibold text-lg text-bcs-green mb-1 line-clamp-1 group-hover:underline">
                    {event.title}
                  </h2>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{new Date(event.date).toLocaleDateString()}</p>
                    {event.location && <p>{event.location}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
