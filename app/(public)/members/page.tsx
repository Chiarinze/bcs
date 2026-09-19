import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RevealWrapper } from "@/components/RevealWrapper";
import { getDirectoryGroups, describeMember } from "@/lib/directory";
import { fullName } from "@/lib/leadership";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Our Members",
  description:
    "Meet the singers and instrumentalists of The Benin Chorale & Philharmonic — full members, probationary members and IT students from across Benin City and beyond.",
  alternates: { canonical: "/members" },
};

function excerpt(bio: string | null, max = 140): string | null {
  if (!bio) return null;
  const flat = bio.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max).replace(/\s\S*$/, "") + "…" : flat;
}

export default async function MembersPage() {
  const groups = await getDirectoryGroups();
  const total = groups.reduce((n, g) => n + g.members.length, 0);

  return (
    <RevealWrapper>
      <section className="bg-[#F9F9F7] py-24 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" data-reveal>
            <h1 className="text-4xl md:text-5xl font-serif text-bcs-green mb-4">
              Our Members
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The voices and instruments behind every performance — {total}{" "}
              musicians from medicine, education, engineering, law, the arts and
              more.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Are you a member?{" "}
              <Link href="/member-login" className="text-bcs-green font-medium underline">
                Log in to your dashboard
              </Link>
            </p>
          </div>

          {groups.length === 0 && (
            <p className="text-center text-gray-500" data-reveal>
              Our members directory is being prepared. Please check back soon.
            </p>
          )}

          {groups.map((group) => (
            <div key={group.status} className="mb-20" data-reveal>
              <div className="flex items-baseline justify-center gap-3 mb-10">
                <h2 className="text-3xl font-serif text-bcs-green">{group.label}</h2>
                <span className="text-sm text-gray-400">{group.members.length}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                {group.members.map((m) => {
                  const name = fullName(m);
                  const line = describeMember(m);
                  const short = excerpt(m.bio);
                  const card = (
                    <>
                      {m.photo_url ? (
                        <Image
                          src={m.photo_url}
                          alt={name}
                          width={144}
                          height={144}
                          sizes="(max-width: 640px) 40vw, 144px"
                          className="rounded-full object-cover w-28 h-28 md:w-36 md:h-36 mb-4"
                        />
                      ) : (
                        <div className="rounded-full w-28 h-28 md:w-36 md:h-36 mb-4 bg-bcs-green/10 flex items-center justify-center text-bcs-green font-serif text-2xl">
                          {m.first_name?.[0]}
                          {m.last_name?.[0]}
                        </div>
                      )}
                      <h3 className="font-serif text-base md:text-lg text-bcs-green leading-tight">
                        {name}
                      </h3>
                      {line && <p className="text-xs md:text-sm text-gray-600 mt-1">{line}</p>}
                      {short && (
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed hidden sm:block">
                          {short}
                        </p>
                      )}
                    </>
                  );

                  return m.slug ? (
                    <Link
                      key={m.id}
                      href={`/members/${m.slug}`}
                      className="flex flex-col items-center text-center group"
                    >
                      {card}
                      <span className="text-bcs-accent text-xs font-medium mt-2 group-hover:underline">
                        View profile
                      </span>
                    </Link>
                  ) : (
                    <div key={m.id} className="flex flex-col items-center text-center">
                      {card}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="text-center mt-8" data-reveal>
            <p className="text-gray-700 mb-6">Want to sing or play with us?</p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full font-medium bg-bcs-green text-white hover:bg-bcs-accent transition-colors hover-lift"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </RevealWrapper>
  );
}
