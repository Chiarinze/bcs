import { Metadata } from "next";
import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import InternalRegistrationForm from "@/components/events/InternalRegistrationForm";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;

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
  const { slug } = params;

  // Fetch event details
  const { data: event } = await supabase
    .from("events")
    .select("id, title, is_internal")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  // If it's NOT an internal event, this page shouldn't be accessed manually this way, 
  // or you could redirect to the purchase page.
  if (!event.is_internal) {
     return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
            <h1 className="text-xl mb-4">This is a public event.</h1>
            <Link href={`/events/${slug}/purchase`}>
                <Button>Go to Ticket Page</Button>
            </Link>
        </div>
     )
  }

  return (
    <section className="py-16 md:py-24 bg-[#F9F9F7] px-4">
      <div className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-3xl font-serif text-bcs-green mb-2">{event.title}</h1>
        <p className="text-gray-500">Internal Registration</p>
      </div>
      
      <InternalRegistrationForm eventId={event.id} eventSlug={slug} />
    </section>
  );
}