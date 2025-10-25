// components/admin/TicketList.tsx
"use client";

import { useEffect, useState } from "react";

interface Ticket {
  id: string;
  buyer_name: string;
  buyer_email: string;
  amount_paid: number;
  payment_ref: string;
  created_at: string;
  events?: { title: string };
  coupons?: { code: string };
}

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => setTickets(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading tickets...</div>;

  if (tickets.length === 0)
    return <div className="text-gray-600">No tickets found.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">Event</th>
            <th className="p-2 border">Buyer</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Amount</th>
            <th className="p-2 border">Coupon</th>
            <th className="p-2 border">Ref</th>
            <th className="p-2 border">Date</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="p-2">{t.events?.title ?? "—"}</td>
              <td className="p-2">{t.buyer_name}</td>
              <td className="p-2">{t.buyer_email}</td>
              <td className="p-2">₦{t.amount_paid}</td>
              <td className="p-2">{t.coupons?.code ?? "—"}</td>
              <td className="p-2 text-xs">{t.payment_ref}</td>
              <td className="p-2 text-xs">
                {new Date(t.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
