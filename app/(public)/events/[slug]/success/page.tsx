import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabaseServer";
import { getSiteContent } from "@/lib/siteContent";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Mail, Music, ShoppingBag, ExternalLink } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export const metadata: Metadata = {
  title: "Success",
  description: "Your registration or ticket purchase was successful.",
  robots: { index: false, follow: false },
};

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref: reference } = await searchParams;

  const supabase = createServerSupabase();
  const [{ data: event, error }, links] = await Promise.all([
    supabase.from("events").select("id, slug, title, is_paid").eq("slug", slug).single(),
    getSiteContent("links"),
  ]);

  if (error || !event) notFound();

  const heading = event.is_paid ? "Payment Successful" : "Registration Successful";
  const message = event.is_paid
    ? "Thank you for your payment! Your ticket has been recorded."
    : "You’re now registered for this event! We look forward to seeing you there.";

  return (
    <section className="py-20 bg-[#F9F9F7] min-h-screen px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-10 text-center">
        <CheckCircle className="w-16 h-16 text-bcs-green mx-auto mb-6" />

        <h1 className="text-3xl font-serif text-bcs-green mb-4">{heading}</h1>
        <p className="text-gray-600 mb-4">{message}</p>

        <div className="flex items-start gap-3 text-left bg-bcs-green/5 border border-bcs-green/20 rounded-xl p-4 mb-6">
          <Mail className="w-5 h-5 text-bcs-green shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            <span className="font-medium text-bcs-green">Check your email.</span> We’ve sent you a
            confirmation with more information. If it doesn’t arrive within a few minutes, look in your
            spam or promotions folder.
          </p>
        </div>

        {reference && (
          <p className="text-sm text-gray-500 mb-8">
            Reference: <span className="font-medium">{reference}</span>
          </p>
        )}

        <div className="border-t border-gray-100 pt-6 space-y-3">
          <p className="text-sm text-gray-500">While you’re here</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/performances"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium bg-bcs-green text-white hover:bg-bcs-accent transition-colors"
            >
              <Music className="w-4 h-4" /> Our previous performances
            </Link>
            {links.music_scores_url && (
              <a
                href={links.music_scores_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium border border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> Buy music scores
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-4 text-sm">
          <Link href={`/events/${event.slug}`} className="text-gray-500 underline">
            View event
          </Link>
          <Link href="/events" className="text-gray-500 underline">
            All events
          </Link>
        </div>
      </div>
    </section>
  );
}
