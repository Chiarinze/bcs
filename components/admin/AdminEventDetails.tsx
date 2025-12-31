"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import EventOverview from "./event-details/EventOverview";
import AttendeesSection from "./event-details/AttendeesSection";
import CouponsSection from "./event-details/CouponsSection";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
  totalTickets: number;
  categories: { id: string; name: string; price: number }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codes: any[];
}

export default function AdminEventDetails({ event, totalTickets, categories, codes }: Props) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/events/${event.slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif text-bcs-green">{event.title}</h1>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push(`/admin/events/${event.slug}/edit`)}
            className="bg-bcs-accent hover:bg-bcs-green"
          >
            Edit
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Overview */}
      <EventOverview event={event} totalTickets={totalTickets} />

      {/* Attendees */}
      <AttendeesSection event={event} categories={categories} />

      {/* Coupons */}
      {event.is_paid && !event.is_internal && <CouponsSection event={event} codes={codes} />}
    </div>
  );
}
