"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";
import Button from "@/components/ui/Button";
import EventOverview from "./event-details/EventOverview";
import AttendeesSection from "./event-details/AttendeesSection";
import CouponsSection from "./event-details/CouponsSection";
import DocumentsSection from "./event-details/DocumentsSection";

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
  const [registrationClosed, setRegistrationClosed] = useState<boolean>(
    !!event.registration_closed,
  );
  const [togglingReg, setTogglingReg] = useState(false);

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

  async function handleToggleRegistration() {
    const next = !registrationClosed;
    const confirmMsg = next
      ? "Close registration? Nobody will be able to register or buy a ticket until you reopen it."
      : "Reopen registration? Members and the public will be able to register again.";
    if (!confirm(confirmMsg)) return;

    setTogglingReg(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closed: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update registration status");
      }
      setRegistrationClosed(next);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setTogglingReg(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-serif text-bcs-green">{event.title}</h1>
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

      {/* Registration Toggle */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-5 ${
          registrationClosed
            ? "bg-red-50 border-red-200"
            : "bg-green-50 border-green-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              registrationClosed ? "bg-red-100" : "bg-green-100"
            }`}
          >
            {registrationClosed ? (
              <Lock className="w-5 h-5 text-red-600" />
            ) : (
              <Unlock className="w-5 h-5 text-green-600" />
            )}
          </div>
          <div>
            <p
              className={`font-semibold ${
                registrationClosed ? "text-red-800" : "text-green-800"
              }`}
            >
              Registration is {registrationClosed ? "closed" : "open"}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {registrationClosed
                ? "Nobody can register or buy tickets for this event."
                : "Anyone eligible can register or buy tickets."}
            </p>
          </div>
        </div>
        <Button
          onClick={handleToggleRegistration}
          loading={togglingReg}
          className={
            registrationClosed
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }
        >
          {registrationClosed ? "Reopen Registration" : "Close Registration"}
        </Button>
      </div>

      <EventOverview event={event} totalTickets={totalTickets} />

      <DocumentsSection event={event} />

      <AttendeesSection event={event} categories={categories} />

      {event.is_paid && !event.is_internal && <CouponsSection event={event} codes={codes} />}
    </div>
  );
}
