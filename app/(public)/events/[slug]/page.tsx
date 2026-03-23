import { supabase } from "@/lib/supabaseClient";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import EventImage from "@/components/common/EventImage";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { TicketCategory } from "@/types";
import { FileText, FileIcon } from "lucide-react";
import DownloadButton from "@/components/common/DownloadButton";

interface Props {
  params: Promise<{ slug: string }>;
}

interface EventDocument {
  id: string;
  name: string;
  file_url: string;
  storage_path: string;
  created_at: string;
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
  const description =
    event.description ||
    "Internal registration for members of the Benin Chorale & Philharmonic.";
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
  const { slug } = await params;

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !event) notFound();

  // Internal events are only visible to authenticated members
  if (event.is_internal) {
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
    if (!user) notFound();
  }

  const [categoriesRes, docsRes] = await Promise.all([
    supabase
      .from("ticket_categories")
      .select("*")
      .eq("event_id", event.id)
      .order("price", { ascending: true }),
    supabase
      .from("event_documents")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true }),
  ]);

  const categories = categoriesRes.data;
  const documents = docsRes.data;

  const isAudition = event.event_type === "audition";

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
              {event.event_type === "audition" ? (
                <Link href={`/events/${event.slug}/register`}>
                  <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                    Register for Audition
                  </Button>
                </Link>
              ) : event.is_internal ? (
                <Link href={`/events/${event.slug}/register`}>
                  <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                    Member Registration
                  </Button>
                </Link>
              ) : (
                <Link href={`/events/${event.slug}/purchase`}>
                  <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                    {event.is_paid ? "Buy Ticket" : "Register (Free)"}
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

          {documents && documents.length > 0 && (
            <div className="border-t border-gray-100 pt-8 mt-8">
              <h2 className="text-2xl font-serif text-bcs-green mb-4">
                Event Resources & Downloads
              </h2>
              <p className="text-gray-600 mb-6">
                Download the event programme, schedule, and other important
                documents.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((doc: EventDocument) => {
                  const isPdf = doc.file_url.toLowerCase().endsWith(".pdf");

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-bcs-accent/40 hover:bg-gray-50/50 transition group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-bcs-green/10 text-bcs-green">
                          {isPdf ? (
                            <FileText size={20} />
                          ) : (
                            <FileIcon size={20} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-medium text-gray-900 truncate pr-2"
                            title={doc.name}
                          >
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-500 uppercase">
                            {isPdf ? "PDF Document" : "File"}
                          </p>
                        </div>
                      </div>

                      <DownloadButton url={doc.file_url} fileName={doc.name} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
          {!event.is_internal && !event.is_paid && !isAudition && (
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
                Member Registration
              </h2>
              <p className="text-gray-600 mb-4">
                This event is restricted to members of the Benin Chorale &
                Philharmonic. Please proceed to register.
              </p>
              <Link href={`/events/${event.slug}/register`}>
                <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full">
                  Register Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
