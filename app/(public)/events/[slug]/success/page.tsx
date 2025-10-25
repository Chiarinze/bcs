import { createServerSupabase } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { CheckCircle } from "lucide-react";

interface Props {
  params: { slug: string };
  searchParams: { ref?: string };
}

export const metadata = {
  title: "Success | The Benin Chorale & Philharmonic",
  description: "Your registration or ticket purchase was successful.",
};

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = params;
  const reference = searchParams.ref;

  const supabase = createServerSupabase();

  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, is_paid")
    .eq("slug", slug)
    .single();

  if (error || !event) notFound();

  const heading = event.is_paid
    ? "Payment Successful 🎉"
    : "Registration Successful 🎉";

  const message = event.is_paid
    ? "Thank you for your payment! Your ticket has been recorded successfully."
    : "You’re now registered for this event! We look forward to seeing you there.";

  return (
    <section className="py-20 bg-[#F9F9F7] min-h-screen px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-10 text-center">
        <CheckCircle className="w-16 h-16 text-bcs-green mx-auto mb-6" />

        <h1 className="text-3xl font-serif text-bcs-green mb-4">{heading}</h1>

        <p className="text-gray-600 mb-6">{message}</p>

        {reference && (
          <p className="text-sm text-gray-500 mb-8">
            Reference: <span className="font-medium">{reference}</span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/events">
            <Button className="bg-bcs-green hover:bg-bcs-accent rounded-full px-6">
              Back to Events
            </Button>
          </Link>

          <Link href={`/events/${event.slug}`}>
            <Button
              variant="outline"
              className="border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white rounded-full px-6"
            >
              View Event
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
