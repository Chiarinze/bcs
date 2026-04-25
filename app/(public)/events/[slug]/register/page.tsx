import { Metadata } from "next";
import { supabase } from "@/lib/supabaseClient";
import { notFound, redirect } from "next/navigation";
import InternalRegistrationForm from "@/components/events/InternalRegistrationForm";
import Link from "next/link";
import Button from "@/components/ui/Button";
import AuditionRegistrationForm from "@/components/events/AuditionRegistrationForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const { data: event } = await supabase
    .from("events")
    .select("title, description, image_url")
    .eq("slug", slug)
    .single();

  if (!event) return { title: "Event Not Found" };

  const title = `Register for ${event.title}`;
  const description = event.description || "Internal registration for members of the Benin Chorale & Philharmonic.";
  const imageUrl = event.image_url || "/icon.jpeg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://www.beninchoraleandphilharmonic.com/events/${slug}/register`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function EventRegisterPage({ params }: Props) {
  const { slug } = await params;

  // Fetch event details
  const { data: event } = await supabase
    .from("events")
    .select("id, title, is_internal, event_type, registration_closed")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  // Internal events now register through the member dashboard
  if (event.is_internal || event.event_type === 'internal') {
    redirect(`/dashboard/events/${slug}`);
  }

  // If it's a standard public event, redirect to purchase/tickets
  if (event.event_type === 'standard' && !event.is_internal) {
     return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
            <h1 className="text-xl mb-4">This event uses standard ticket registration.</h1>
            <Link href={`/events/${slug}/purchase`}>
                <Button>Go to Ticket Page</Button>
            </Link>
        </div>
     )
  }

  if (event.registration_closed) {
    return (
      <section className="py-16 md:py-24 bg-[#F9F9F7] px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-serif text-bcs-green mb-3">{event.title}</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-1">
              Registration is closed
            </h2>
            <p className="text-sm text-red-700">
              The administrator has closed registration for this event.
            </p>
          </div>
          <Link href={`/events/${slug}`}>
            <Button variant="outline">Back to Event</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-[#F9F9F7] px-4">
      <div className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-3xl font-serif text-bcs-green mb-2">{event.title}</h1>
        <p className="text-gray-500 capitalize">
          {event.event_type === 'audition' ? "Audition Registration" : "Internal Registration"}
        </p>
      </div>
      
      {event.event_type === 'audition' ? (
        <AuditionRegistrationForm eventId={event.id} />
      ) : (
        <InternalRegistrationForm eventId={event.id} eventSlug={slug} />
      )}
    </section>
  );
}