"use client";

import { performances } from "@/data";
import Image from "next/image";
import { RevealWrapper } from "@/components/RevealWrapper";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function Performances() {
  const sortedPerformances = [...performances].sort((a, b) => {
    const dateA = new Date(a.date!);
    const dateB = new Date(b.date!);

    return dateB.getTime() - dateA.getTime();
  });

  return (
    <RevealWrapper>
      <section className="bg-[#F9F9F7] py-24 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16" data-reveal>
            <h1 className="text-4xl md:text-5xl font-serif text-bcs-green mb-4">
              Past Performances
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A look back at our most memorable concerts, symphonies, and
              musical moments — blending choral excellence with orchestral
              artistry.
            </p>
          </div>

          {/* Performance Cards */}
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10"
            data-reveal
          >
            {sortedPerformances.map((performance) => (
              <div
                key={performance.id}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition card-hover"
              >
                {/* Image */}
                <div className="relative w-full h-60">
                  <Image
                    src={performance.image}
                    alt={performance.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Info */}
                <div className="p-6 flex flex-col justify-between min-h-[160px]">
                  <div>
                    <h3 className="font-serif text-xl text-bcs-green mb-2">
                      {performance.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      {performance.date} • {performance.location}
                    </p>
                  </div>

                  {performance.link && (
                    <a
                      href={performance.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bcs-accent text-sm font-medium hover:underline mt-2"
                    >
                      Watch Excerpt →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center mt-20" data-reveal>
            <p className="text-gray-700 mb-6">
              Want to experience our next concert?
            </p>
            <Link href="/events">
              <Button variant="primary" className="px-8 py-3">
                View Upcoming Events
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </RevealWrapper>
  );
}
