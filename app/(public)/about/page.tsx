import type { Metadata } from "next";
import About from "@/components/sections/About";
import { getSiteContent } from "@/lib/siteContent";
import { getLeadership } from "@/lib/leadership";

// Content is admin-managed; the API revalidates this path on every save.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about The Benin Chorale & Philharmonic — our mission, vision, and the people behind Nigeria’s premier choral and orchestral ensemble.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [content, board, management] = await Promise.all([
    getSiteContent("about"),
    getLeadership("executive"),
    getLeadership("management"),
  ]);

  return <About content={content} board={board} management={management} />;
}
