import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import EventImage from "@/components/common/EventImage";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { TicketCategory } from "@/types";

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

export default async function EventDetail({ params }: Props) {
  const { slug } = params;

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  const { data: categories } = await supabase
    .from("ticket_categories")
    .select("*")
    .eq("event_id", event.id)
    .order("price", { ascending: true });

  if (error || !event) notFound();

  return (
    <section className="py-16 md:py-20 bg-[#F9F9F7] px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Hero Image */}
        {event.image_url && (
          <div className="relative w-full h-80 md:h-[450px]">
            <EventImage
              src={event.image_url}
              alt={event.title}
              blurData={event.image_blur_data}
            />
          </div>
        )}

        {/* Event Content */}
        <div className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif mb-3 text-bcs-green">
                {event.title}
              </h1>
              <p className="text-gray-600 max-w-2xl">{event.description}</p>
            </div>

            {/* Action Button */}
            <div className="mt-4 md:mt-0">
              {event.is_internal ? (
                // Internal Event Button
                <Link href={`/events/${event.slug}/register`}>
                  <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                    Member Registration
                  </Button>
                </Link>
              ) : event.is_paid ? (
                // Paid Event Button
                <Link href={`/events/${event.slug}/purchase`}>
                  <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                    Buy Ticket
                  </Button>
                </Link>
              ) : (
                // Free Public Event Button
                <Link href={`/events/${event.slug}/purchase`}>
                  <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                    Register (Free)
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Event Meta Info */}
          <div className="grid sm:grid-cols-2 gap-5 text-gray-700 border-t border-gray-100 pt-6">
            <div>
              <p className="mb-1">
                <span className="font-semibold text-bcs-green">Date:</span>{" "}
                {format(new Date(event.date), "EEEE, MMMM d, yyyy")}
              </p>
              {event.location && (
                <p>
                  <span className="font-semibold text-bcs-green">
                    Location:
                  </span>{" "}
                  {event.location}
                </p>
              )}
            </div>
            <div>
              <p>
                <span className="font-semibold text-bcs-green">
                  Event Type:
                </span>{" "}
                {event.is_paid ? "Paid Event" : "Free Event"}
              </p>
              {event.is_paid && event.price && (
                <p>
                  <span className="font-semibold text-bcs-green">
                    Base Price:
                  </span>{" "}
                  ₦{event.price.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Ticket Categories */}
          {!event.is_internal &&
            event.is_paid &&
            categories &&
            categories.length > 0 && (
              <div className="border-t border-gray-100 pt-8 mt-8">
                <h2 className="text-2xl font-serif text-bcs-green mb-4">
                  Available Tickets
                </h2>
                <p className="text-gray-600 mb-6">
                  Choose your preferred ticket category and proceed to payment.
                </p>

                <ul className="grid sm:grid-cols-2 gap-4">
                  {categories.map((cat: TicketCategory) => (
                    <li
                      key={cat.id}
                      className="p-4 bg-[#fdfcfb] border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-bcs-green">
                            {cat.name}
                          </p>
                          <p className="text-gray-500 text-sm">
                            ₦{cat.price.toLocaleString()}
                          </p>
                        </div>
                        <Link
                          href={{
                            pathname: `/events/${event.slug}/purchase`,
                            query: { category: cat.name, price: cat.price },
                          }}
                        >
                          <Button
                            variant="outline"
                            className="text-sm px-4 py-1 rounded-full"
                          >
                            Buy ₦{cat.price.toLocaleString()}
                          </Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Free Registration Section */}
          {!event.is_internal && !event.is_paid && (
            <div className="border-t border-gray-100 pt-8 mt-8">
              <h2 className="text-2xl font-serif text-bcs-green mb-4">
                Free Registration
              </h2>
              <p className="text-gray-600 mb-4">
                This is a free event. Please register to reserve your seat and
                get updates before the event.
              </p>
              <Link href={`/events/${event.slug}/purchase`}>
                <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                  Register Now
                </Button>
              </Link>
            </div>
          )}

          {/* Internal Event Info Box */}
          {event.is_internal && (
            <div className="border-t border-gray-100 pt-8 mt-8">
              <h2 className="text-2xl font-serif text-bcs-green mb-4">
                Member Information
              </h2>
              <p className="text-gray-600 mb-4">
                This event is restricted to members of the Benin Chorale &
                Philharmonic. You will be required to provide an access code to
                proceed with registration.
              </p>
              <Link href={`/events/${event.slug}/register`}>
                <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                  Enter Access Code
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
