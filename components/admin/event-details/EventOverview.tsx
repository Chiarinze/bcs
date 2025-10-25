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
        <p className="font-semibold">{event.is_paid ? "Paid" : "Free"}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Total Registrations</p>
        <p className="font-semibold">{totalTickets}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Date</p>
        <p className="font-semibold">{new Date(event.date).toLocaleDateString()}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Location</p>
        <p className="font-semibold">{event.location}</p>
      </div>
    </div>
  );
}
