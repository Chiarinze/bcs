import Hero from "@/components/sections/Hero";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { RevealWrapper } from "@/components/RevealWrapper";
import { getSiteContent } from "@/lib/siteContent";
import { getPerformances } from "@/lib/performances";
import { formatLongDate } from "@/lib/formatDate";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [about, performances] = await Promise.all([
    getSiteContent("about"),
    getPerformances(),
  ]);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "PerformingGroup",
    name: "The Benin Chorale & Philharmonic",
    url: "https://www.beninchoraleandphilharmonic.com",
    description: "Promoting choral and orchestral music in Nigeria and beyond.",
    sameAs: [
      "https://web.facebook.com/BcsNig/?_rdc=1&_rdr#",
      "https://www.instagram.com/the_benin_chorale_society/",
    ],
    foundingLocation: {
      "@type": "Place",
      name: "Benin City, Nigeria",
    },
  };

  // Three most recent — deterministic so the cached HTML is stable for crawlers.
  const featuredPerformances = performances.slice(0, 3);

  return (
    <div className="pt-[5.5rem] md:pt-0">
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <Hero />

      <RevealWrapper>
        {/* WHO WE ARE */}
        <section className="bg-[#F9F9F7] py-24 md:py-28 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2
              className="text-4xl md:text-5xl font-serif text-bcs-green mb-8"
              data-reveal
            >
              Who We Are
            </h2>

            <p
              className="text-gray-700 leading-relaxed text-lg max-w-3xl mx-auto"
              data-reveal
            >
              {about.home_intro}
            </p>

            <div className="mt-10" data-reveal>
              <Link
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 cursor-pointer rounded-full font-medium transition-colors hover-lift bg-bcs-green text-white hover:bg-bcs-accent focus:ring-bcs-green/30"
                href="/about"
              >
                Learn More About Us
              </Link>
            </div>
          </div>
        </section>

        {/* PAST PERFORMANCES */}
        <section className="bg-white py-24 md:py-28 px-4 border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-4xl md:text-5xl font-serif text-center mb-12 text-bcs-green"
              data-reveal
            >
              Past Performances
            </h2>

            <div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
              data-reveal
            >
              {featuredPerformances.map((performance) => (
                <div
                  key={performance.id}
                  className="bg-[#415C41] rounded-2xl overflow-hidden text-white shadow-sm hover:shadow-md transition card-hover"
                >
                  <div className="relative w-full h-56">
                    <Image
                      src={performance.image_url}
                      alt={performance.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      placeholder={performance.image_blur_data ? "blur" : "empty"}
                      blurDataURL={performance.image_blur_data || undefined}
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-xl mb-1">
                      {performance.title}
                    </h3>
                    <p className="text-sm text-white/80 mb-3">
                      {formatLongDate(performance.performed_on)}
                    </p>
                    {performance.location && (
                      <p className="text-sm text-white/80 mb-4">
                        {performance.location}
                      </p>
                    )}
                    {performance.link && (
                      <a
                        href={performance.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c57e52] font-medium hover:underline"
                      >
                        Watch Excerpt →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/performances"
                className="text-sm md:text-base text-[#415C41] hover:underline px-4 py-2 rounded-md transition-colors"
              >
                See all performances &rarr;
              </Link>
            </div>
          </div>
        </section>
      </RevealWrapper>
    </div>
  );
}
