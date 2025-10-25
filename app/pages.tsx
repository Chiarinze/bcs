import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Performances from "@/components/sections/Performances";
import Contact from "@/components/sections/Contact";
import { Header } from "@/components/layouts/Header";
import { Footer } from "@/components/layouts/Footer";
import Script from "next/script";

export default function Home() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "PerformingGroup",
    name: "The Benin Chorale & Philharmonic",
    url: "https://www.beninchoraleandphilharmonic.com",
    description: "Promoting choral and orchestral music in Nigeria and beyond.",
    sameAs: [
      "https://www.facebook.com/beninchorale",
      "https://www.instagram.com/beninchorale",
      "https://www.linkedin.com/company/beninchorale",
    ],
    foundingLocation: {
      "@type": "Place",
      name: "Benin City, Nigeria",
    },
  };

  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <Header />
      <div>
        <Hero />
        <About />
        <Performances />
        <Contact />
      </div>
      <Footer />
    </>
  );
}
