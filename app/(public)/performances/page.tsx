import type { Metadata } from "next";
import Performances from "@/components/sections/Performances";
import { getPerformances } from "@/lib/performances";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Past Performances",
  description:
    "Explore past performances by The Benin Chorale & Philharmonic — a celebration of music, culture, and artistry from Nigeria and beyond.",
  alternates: { canonical: "/performances" },
};

export default async function PerformancesPage() {
  const performances = await getPerformances();
  return <Performances performances={performances} />;
}
