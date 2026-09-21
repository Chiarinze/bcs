import { formatEventTime } from "@/lib/eventTime";
interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
  totalTickets: number;
}

export default function EventOverview({ event, totalTickets }: Props) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div>
        <p className="text-sm text-gray-500">Event Type</p>
        <p className="font-semibold text-bcs-green">
          {event.is_internal
            ? event.is_paid
              ? `Internal (Members) · ₦${Number(event.price || 0).toLocaleString()}`
              : "Internal (Members)"
            : event.is_paid
              ? "Paid"
              : "Free"}
          {event.collect_paper_info && " · Paper details collected"}
        </p>
      </div>
      
      <div>
        <p className="text-sm text-gray-500">Total Registrations</p>
        <p className="font-semibold">{totalTickets}</p>
      </div>

      <div>
        <p className="text-sm text-gray-500">Date</p>
        <p className="font-semibold">
          {new Date(event.date).toLocaleDateString()}
          {formatEventTime(event.start_time, event.end_time) && ` · ${formatEventTime(event.start_time, event.end_time)}`}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Location</p>
        <p className="font-semibold">{event.location}</p>
      </div>
    </div>
  );
}