import Performances from "@/components/sections/Performances";

export const metadata = {
  alternates: { canonical: "/performances" },
  title: "Past Performances | The Benin Chorale & Philharmonic",
  description:
    "Explore past performances by The Benin Chorale & Philharmonic — a celebration of music, culture, and artistry from Nigeria and beyond.",
};

export default function PerformancesPage() {
  return <Performances />;
}
