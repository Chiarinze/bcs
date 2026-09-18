import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { RevealWrapper } from "@/components/RevealWrapper";
import { getDirectoryMemberBySlug, describeMember, STATUS_LABELS } from "@/lib/directory";
import { fullName } from "@/lib/leadership";
import { createServerSupabase } from "@/lib/supabaseServer";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

const SITE = "https://www.beninchoraleandphilharmonic.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const member = await getDirectoryMemberBySlug(slug);
  if (!member) return { title: "Member Not Found" };

  const name = fullName(member);
  const description =
    member.bio?.replace(/\s+/g, " ").slice(0, 160) ||
    `${name}, member of The Benin Chorale & Philharmonic.`;

  return {
    title: name,
    description,
    alternates: { canonical: `/members/${slug}` },
    openGraph: {
      title: name,
      description,
      type: "profile",
      url: `${SITE}/members/${slug}`,
      images: member.photo_url ? [{ url: member.photo_url, alt: name }] : undefined,
    },
  };
}

export default async function MemberPage({ params }: Props) {
  const { slug } = await params;
  const member = await getDirectoryMemberBySlug(slug);
  if (!member) notFound();

  const name = fullName(member);
  const line = describeMember(member);
  const paragraphs = (member.bio || "")
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Roles held (board / management), so the page doubles as a leadership profile.
  const supabase = createServerSupabase();
  const { data: roles } = await supabase
    .from("member_roles")
    .select("title")
    .eq("assigned_to", member.id)
    .order("category")
    .order("sort_order");
  const roleTitles = ((roles || []) as { title: string }[]).map((r) => r.title);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: roleTitles[0],
    image: member.photo_url || undefined,
    url: `${SITE}/members/${slug}`,
    memberOf: {
      "@type": "PerformingGroup",
      name: "The Benin Chorale & Philharmonic",
      url: SITE,
    },
  };

  return (
    <>
      <Script
        id="member-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <section className="py-20 px-4 bg-[#F9F9F7] min-h-screen">
        <BackButton />
        <RevealWrapper>
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
            <div className="flex flex-col items-center text-center gap-3" data-reveal>
              {member.photo_url ? (
                <Image
                  src={member.photo_url}
                  alt={name}
                  width={192}
                  height={192}
                  sizes="(max-width: 768px) 60vw, 200px"
                  className="w-48 h-48 object-cover rounded-full mb-4"
                  priority
                />
              ) : (
                <div className="w-48 h-48 rounded-full mb-4 bg-bcs-green/10 flex items-center justify-center text-bcs-green font-serif text-4xl">
                  {member.first_name?.[0]}
                  {member.last_name?.[0]}
                </div>
              )}
              <h1 className="text-4xl font-serif">{name}</h1>
              {roleTitles.length > 0 && (
                <p className="text-bcs-muted text-lg">{roleTitles.join(" · ")}</p>
              )}
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {line && (
                  <span className="text-xs px-3 py-1 rounded-full bg-[#F0EFEA] border border-gray-200 text-bcs-green">
                    {line}
                  </span>
                )}
                <span className="text-xs px-3 py-1 rounded-full bg-[#F0EFEA] border border-gray-200 text-bcs-green">
                  {STATUS_LABELS[member.membership_status].replace(/s$/, "")}
                </span>
                {member.year_inducted && (
                  <span className="text-xs px-3 py-1 rounded-full bg-[#F0EFEA] border border-gray-200 text-bcs-green">
                    Since {member.year_inducted}
                  </span>
                )}
              </div>
            </div>

            {paragraphs.length > 0 ? (
              <div className="mt-6 space-y-6 text-gray-800" data-reveal>
                {paragraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-gray-500 italic" data-reveal>
                {member.first_name} hasn’t written a bio yet.
              </p>
            )}
          </div>
        </RevealWrapper>
      </section>
    </>
  );
}
