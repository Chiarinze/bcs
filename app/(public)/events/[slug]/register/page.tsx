import { Metadata } from "next";
import { supabase } from "@/lib/supabaseClient";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
    .select("id, title, is_internal, event_type")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  // Internal events require member authentication
  if (event.is_internal || event.event_type === 'internal') {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      redirect(`/member-login`);
    }
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