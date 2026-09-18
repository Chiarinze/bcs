import type { Metadata } from "next";
import Contact from "@/components/sections/Contact";
import { getSiteContent } from "@/lib/siteContent";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with The Benin Chorale & Philharmonic for bookings, collaborations, and performances across Nigeria and beyond.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const content = await getSiteContent("contact");
  return <Contact content={content} />;
}
