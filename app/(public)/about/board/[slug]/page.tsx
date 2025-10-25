import { BoardOfDirectors } from "@/data";
import Image from "next/image";
import { Mail, Linkedin } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { RevealWrapper } from "@/components/RevealWrapper";
import Script from "next/script";
import type { Metadata } from "next";

interface BoardMemberPageProps {
  params: Promise<{ slug: string }>;
}

// ✅ Use the correct async destructuring
export async function generateMetadata({
  params,
}: BoardMemberPageProps): Promise<Metadata> {
  const { slug } = await params;
  const member = BoardOfDirectors.find((m) => m.slug === slug);

  if (!member) {
    return {
      title: "Board Member Not Found | The Benin Chorale & Philharmonic",
      description:
        "Meet our board members who lead The Benin Chorale & Philharmonic.",
    };
  }

  return {
    title: `${member.name} | ${member.position} | The Benin Chorale & Philharmonic`,
    description:
      member.about?.[0]?.text.slice(0, 160) || "Board member profile",
    alternates: {
      canonical: `https://www.beninchoraleandphilharmonic.com/board/${slug}`,
    },
    openGraph: {
      title: `${member.name} - ${member.position}`,
      description: member.about?.[0]?.text.slice(0, 200),
      images: [
        {
          url: member.image.src,
          width: 1200,
          height: 630,
          alt: `${member.name} - ${member.position}`,
        },
      ],
      type: "profile",
    },
  };
}

export default async function BoardMemberPage({
  params,
}: BoardMemberPageProps) {
  const { slug } = await params;
  const member = BoardOfDirectors.find((m) => m.slug === slug);

  if (!member) {
    return (
      <div className="py-20 text-center text-gray-600">
        <BackButton />
        <p>Board member not found.</p>
      </div>
    );
  }

  const { contact } = member;

  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: member.name,
    jobTitle: member.position,
    image: member.image.src,
    url: `https://www.beninchoraleandphilharmonic.com/board/${slug}`,
  };

  return (
    <>
      <Script
        id="profile-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileSchema),
        }}
      />

      <section className="py-20 px-4 bg-[#F9F9F7] min-h-screen">
        <BackButton />
        <RevealWrapper>
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
            <div
              className="flex flex-col items-center text-center gap-4"
              data-reveal
            >
              <Image
                src={member.image}
                alt={`${member.name}, ${member.position}`}
                className="w-48 h-48 object-cover rounded-full mb-6"
                sizes="(max-width: 768px) 60vw, 200px"
                priority
              />
              <h1 className="text-4xl font-serif">{member.name}</h1>
              <p className="text-bcs-muted text-lg">{member.position}</p>
            </div>

            <div className="mt-8 space-y-6 text-gray-800" data-reveal>
              {member.about.map((paragraph) => (
                <p key={paragraph.id} className="leading-relaxed">
                  {paragraph.text}
                </p>
              ))}
            </div>

            {contact && (contact.email || contact.linkedin) && (
              <div
                className="mt-10 w-full grid md:grid-cols-2 gap-6"
                data-reveal
              >
                {contact.email && (
                  <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition">
                    <Mail className="text-bcs-green" size={28} />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-bcs-green hover:text-bcs-accent font-medium"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.linkedin && (
                  <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition">
                    <Linkedin className="text-bcs-green" size={28} />
                    <a
                      href={contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bcs-green hover:text-bcs-accent font-medium"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Separator */}
            <div className="w-full h-[1px] bg-bcs-accent my-8" data-reveal />
          </div>
        </RevealWrapper>
      </section>
    </>
  );
}
