import Link from "next/link";
import PurchaseForm from "@/components/events/PurchaseForm";
import Button from "@/components/ui/Button";
import { createServerSupabase } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: "Purchase Ticket | The Benin Chorale & Philharmonic",
  description: "Secure your ticket or register for an event.",
};

export default async function PurchasePage({ params }: Props) {
  const supabase = createServerSupabase();
  const { slug } = await params;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (eventError || !event) notFound();

  if (event.registration_closed) {
    return (
      <section className="py-20 bg-[#F9F9F7] px-4">
        <div className="max-w-2xl mx-auto bg-white shadow-sm rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-serif mb-3 text-bcs-green">
            {event.title}
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-1">
              Registration is closed
            </h2>
            <p className="text-sm text-red-700">
              The administrator has closed registration for this event. Tickets
              are no longer available.
            </p>
          </div>
          <Link href={`/events/${slug}`}>
            <Button variant="outline">Back to Event</Button>
          </Link>
        </div>
      </section>
    );
  }

  const { data: categories, error: catError } = await supabase
    .from("ticket_categories")
    .select("*")
    .eq("event_id", event.id)
    .order("price", { ascending: true });

  if (catError) {
    console.error("Error loading categories:", catError.message);
  }

  return (
    <section className="py-20 bg-[#F9F9F7] px-4">
      <div className="max-w-2xl mx-auto bg-white shadow-sm rounded-2xl p-8">
        <h1 className="text-2xl font-serif mb-6 text-center text-bcs-green">
          {event.title}
        </h1>

        <PurchaseForm event={event} categories={categories || []} />
      </div>
    </section>
  );
}
