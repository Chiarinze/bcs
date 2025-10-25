// app/admin/tickets/page.tsx
import TicketList from "@/components/admin/TicketList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tickets | Admin",
};

export default function AdminTicketsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Ticket Sales</h1>
      <TicketList />
    </div>
  );
}
