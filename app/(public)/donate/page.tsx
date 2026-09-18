import type { Metadata } from "next";
import DonateClient from "./DonateClient";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support The Benin Chorale & Philharmonic — your donation funds concerts, music education, and community outreach in Benin City and beyond.",
  alternates: { canonical: "/donate" },
};

export default function DonatePage() {
  return <DonateClient />;
}
