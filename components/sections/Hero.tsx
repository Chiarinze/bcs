"use client";

import Image from "next/image";
import { IMAGES } from "@/assets/images";
import useReveal from "@/hooks/useReveal";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function Hero() {
  useReveal();
  const router = useRouter();

  return (
    <section
      id="hero"
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* background image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={IMAGES.bcs4}
          alt="Benin Chorale performance"
          fill
          priority
          className="object-cover scale-105 animate-slow-zoom"
        />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/75 backdrop-blur-[1px]" />
      </div>

      {/* content */}
      <div className="relative z-10 container mx-auto text-center px-4">
        <div
          data-reveal
          className="max-w-4xl mx-auto transition-all duration-700"
        >
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif font-bold leading-tight drop-shadow-lg tracking-tight">
            <span className="block mb-2 text-white">Musical Excellence</span>
            <span className="block text-3xl md:text-4xl lg:text-6xl font-light text-gray-200 tracking-wide">
              Where Passion Meets Performance
            </span>
          </h1>

          <p className="mt-8 text-base md:text-lg lg:text-xl text-gray-100/90 leading-relaxed max-w-2xl mx-auto">
            Inspiring and empowering musicians through choral and orchestral
            performance — blending traditional African sounds with classical
            precision.
          </p>

          {/* CTA Buttons */}
          <div
            data-reveal
            className="mt-12 flex flex-col sm:grid sm:grid-cols-2 items-center justify-center gap-5 transition-all duration-700 delay-200 w-full py-8"
          >
            <Button
              variant="outline"
              onClick={() => router.push("/about")}
              className="px-6 py-3 text-white border-white hover:bg-white hover:text-[#415c41] w-full"
            >
              Learn More
            </Button>

            <Button
              variant="primary"
              onClick={() => router.push("/contact")}
              className="px-6 py-3 w-full"
            >
              Book Us
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
