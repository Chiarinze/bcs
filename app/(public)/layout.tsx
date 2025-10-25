import { Header } from "@/components/layouts/Header";
import { Footer } from "@/components/layouts/Footer";
import "@/app/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "The Benin Chorale & Philharmonic",
    template: "%s | The Benin Chorale & Philharmonic",
  },
  description:
    "Celebrating the beauty of choral and orchestral music through excellence, culture, and collaboration.",
  openGraph: {
    title: "The Benin Chorale & Philharmonic",
    description:
      "Promoting choral and orchestral music in Nigeria and beyond.",
    type: "website",
    url: "https://www.beninchoraleandphilharmonic.com",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Benin Chorale & Philharmonic",
    description:
      "Promoting choral and orchestral music in Nigeria and beyond.",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased bg-bcs-bg text-bcs-text">
        <Header />
        <main
          id="main-content"
          className="min-h-screen relative isolate overflow-hidden"
        >
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
