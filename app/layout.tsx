import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.beninchoraleandphilharmonic.com"),
  title: {
    default: "The Benin Chorale & Philharmonic",
    template: "%s | The Benin Chorale & Philharmonic",
  },
  description:
    "Promoting choral and orchestral music in Nigeria and beyond.",
  keywords: [
    "Benin Chorale",
    "Benin Philharmonic",
    "Nigerian choir",
    "orchestra",
    "choral music",
    "African classical music",
  ],
  openGraph: {
    title: "The Benin Chorale & Philharmonic",
    description:
      "Promoting choral and orchestral music in Nigeria and beyond.",
    url: "https://www.beninchoraleandphilharmonic.com",
    siteName: "Benin Chorale & Philharmonic",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/icon.jpeg",
        width: 474,
        height: 467,
        alt: "Benin Chorale & Philharmonic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Benin Chorale & Philharmonic",
    description:
      "Promoting choral and orchestral music in Nigeria and beyond.",
    images: ["/icon.jpeg"],
    creator: "@bcs",
  },
  icons: {
    icon: "/icon.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased bg-bcs-bg text-bcs-text selection:bg-bcs-accent/20">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
