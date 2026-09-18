import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackButton } from "@/components/ui/BackButton";
import { RevealWrapper } from "@/components/RevealWrapper";
import { getBoardMemberBySlug, fullName } from "@/lib/leadership";

export const revalidate = 3600;

interface BoardMemberPageProps {
  params: Promise<{ slug: string }>;
}

const SITE = "https://www.beninchoraleandphilharmonic.com";

export async function generateMetadata({
  params,
}: BoardMemberPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getBoardMemberBySlug(slug);

  if (!entry) {
    return {
      title: "Board Member Not Found",
      description:
        "Meet our board members who lead The Benin Chorale & Philharmonic.",
    };
  }

  const name = fullName(entry.profile);
  const description =
    entry.profile.bio?.slice(0, 160) ||
    `${name}, ${entry.role.title} at The Benin Chorale & Philharmonic.`;

  return {
    title: `${name} | ${entry.role.title}`,
    description,
    alternates: { canonical: `/about/board/${slug}` },
    openGraph: {
      title: `${name} - ${entry.role.title}`,
      description,
      type: "profile",
      url: `${SITE}/about/board/${slug}`,
      images: entry.profile.photo_url
        ? [{ url: entry.profile.photo_url, alt: `${name} - ${entry.role.title}` }]
        : undefined,
    },
  };
}

export default async function BoardMemberPage({ params }: BoardMemberPageProps) {
  const { slug } = await params;
  const entry = await getBoardMemberBySlug(slug);
  if (!entry) notFound();

  const name = fullName(entry.profile);
  const paragraphs = (entry.profile.bio || "")
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: entry.role.title,
    image: entry.profile.photo_url || undefined,
    url: `${SITE}/about/board/${slug}`,
    worksFor: {
      "@type": "PerformingGroup",
      name: "The Benin Chorale & Philharmonic",
      url: SITE,
    },
  };

  return (
    <>
      <Script
        id="profile-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
      />

      <section className="py-20 px-4 bg-[#F9F9F7] min-h-screen">
        <BackButton />
        <RevealWrapper>
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
            <div className="flex flex-col items-center text-center gap-4" data-reveal>
              {entry.profile.photo_url ? (
                <Image
                  src={entry.profile.photo_url}
                  alt={`${name}, ${entry.role.title}`}
                  width={192}
                  height={192}
                  className="w-48 h-48 object-cover rounded-full mb-6"
                  sizes="(max-width: 768px) 60vw, 200px"
                  priority
                />
              ) : (
                <div className="w-48 h-48 rounded-full mb-6 bg-bcs-green/10 flex items-center justify-center text-bcs-green font-serif text-4xl">
                  {entry.profile.first_name?.[0]}
                  {entry.profile.last_name?.[0]}
                </div>
              )}
              <h1 className="text-4xl font-serif">{name}</h1>
              <p className="text-bcs-muted text-lg">{entry.role.title}</p>
            </div>

            {paragraphs.length > 0 && (
              <div className="mt-8 space-y-6 text-gray-800" data-reveal>
                {paragraphs.map((paragraph, i) => (
                  <p key={i} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        </RevealWrapper>
      </section>
    </>
  );
}
