import Image from "next/image";
import Link from "next/link";
import { RevealWrapper } from "@/components/RevealWrapper";
import { fullName } from "@/lib/leadership";
import type { AboutContent, LeadershipEntry } from "@/types";

interface Props {
  content: AboutContent;
  board: LeadershipEntry[];
  management: LeadershipEntry[];
}

function PersonCard({
  entry,
  href,
}: {
  entry: LeadershipEntry;
  href?: string;
}) {
  const name = fullName(entry.profile);
  return (
    <div className="flex flex-col items-center text-center">
      {entry.profile.photo_url ? (
        <Image
          src={entry.profile.photo_url}
          alt={name}
          width={160}
          height={160}
          className="rounded-full object-cover mb-4 w-40 h-40"
        />
      ) : (
        <div className="rounded-full mb-4 w-40 h-40 bg-bcs-green/10 flex items-center justify-center text-bcs-green font-serif text-3xl">
          {entry.profile.first_name?.[0]}
          {entry.profile.last_name?.[0]}
        </div>
      )}
      <h4 className="font-serif text-lg text-bcs-green">{name}</h4>
      <p className="text-sm text-gray-600 mb-2">{entry.role.title}</p>
      {href && (
        <Link
          href={href}
          className="text-bcs-accent text-sm font-medium hover:underline"
        >
          View Profile
        </Link>
      )}
    </div>
  );
}

export default function About({ content, board, management }: Props) {
  return (
    <RevealWrapper>
      <section className="bg-[#F9F9F7] py-24 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          {/* TITLE */}
          <div className="text-center mb-16" data-reveal>
            <h1 className="text-4xl md:text-5xl font-serif text-bcs-green mb-4">
              About Us
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">{content.tagline}</p>
          </div>

          {/* INTRO */}
          {content.intro.length > 0 && (
            <div className="space-y-6 max-w-4xl mx-auto mb-16 text-gray-700 leading-relaxed">
              {content.intro.map((paragraph, i) => (
                <p key={i} data-reveal>
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {/* MISSION + VISION */}
          {(content.mission || content.vision) && (
            <div
              className="grid md:grid-cols-2 gap-8 text-white mb-20"
              data-reveal
            >
              {content.mission && (
                <div className="bg-bcs-muted p-8 rounded-2xl shadow-sm hover-lift">
                  <h3 className="font-serif text-2xl mb-3">Our Mission</h3>
                  <p>{content.mission}</p>
                </div>
              )}
              {content.vision && (
                <div className="bg-bcs-muted p-8 rounded-2xl shadow-sm hover-lift">
                  <h3 className="font-serif text-2xl mb-3">Our Vision</h3>
                  <p>{content.vision}</p>
                </div>
              )}
            </div>
          )}

          {/* WHAT WE DO */}
          {content.what_we_do.length > 0 && (
            <div className="mb-24" data-reveal>
              <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-10 text-center">
                What We Do
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content.what_we_do.map((item) => (
                  <div
                    key={item.title}
                    className="bg-bcs-accent text-white p-6 rounded-xl shadow-sm hover:shadow-md transition"
                  >
                    <h4 className="font-serif text-xl mb-2">{item.title}</h4>
                    <p className="text-sm opacity-90">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REPERTOIRE */}
          {content.repertoire.length > 0 && (
            <div className="text-center mb-24 max-w-3xl mx-auto" data-reveal>
              <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-6">
                Our Musical Repertoire
              </h2>
              {content.repertoire_intro && (
                <p className="text-gray-700 mb-4">{content.repertoire_intro}</p>
              )}
              <ul className="flex flex-wrap justify-center gap-3 text-bcs-green font-medium">
                {content.repertoire.map((style) => (
                  <li
                    key={style}
                    className="px-4 py-2 bg-[#F0EFEA] rounded-full border border-gray-200"
                  >
                    {style}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SERVICES + JOIN US */}
          {(content.services || content.join_us) && (
            <div
              className="grid md:grid-cols-2 gap-8 text-white mb-24"
              data-reveal
            >
              {content.services && (
                <div className="bg-bcs-green p-8 rounded-2xl shadow-sm hover-lift">
                  <h3 className="font-serif text-2xl mb-3">Our Services</h3>
                  <p>{content.services}</p>
                </div>
              )}
              {content.join_us && (
                <div className="bg-bcs-green p-8 rounded-2xl shadow-sm hover-lift">
                  <h3 className="font-serif text-2xl mb-3">Join Us</h3>
                  <p>{content.join_us}</p>
                  <div className="mt-6">
                    <Link
                      href="/contact"
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full font-medium border border-white text-white hover:bg-white hover:text-bcs-green transition-colors"
                    >
                      Contact Us
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ARMS */}
          {content.arms.length > 0 && (
            <div className="mb-24" data-reveal>
              <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-10 text-center">
                Our Arms
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content.arms.map((arm) => (
                  <div
                    key={arm}
                    className="bg-bcs-accent text-white p-6 rounded-xl shadow-sm hover:shadow-md"
                  >
                    <h4 className="font-serif text-xl">{arm}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOARD OF DIRECTORS */}
          {board.length > 0 && (
            <div className="mb-24" data-reveal>
              <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-10 text-center">
                Our Board of Directors
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {board.map((entry) => (
                  <PersonCard
                    key={entry.role.id}
                    entry={entry}
                    href={
                      entry.profile.slug
                        ? `/about/board/${entry.profile.slug}`
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* MANAGEMENT + PART LEADERS */}
          {(content.management_units.length > 0 || management.length > 0) && (
            <div data-reveal>
              <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-10 text-center">
                Our Management &amp; Part Leaders
              </h2>
              {content.management_units.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                  {content.management_units.map((unit) => (
                    <div
                      key={unit}
                      className="bg-bcs-accent text-white p-6 rounded-xl shadow-sm hover:shadow-md"
                    >
                      <p className="font-serif text-lg">{unit}</p>
                    </div>
                  ))}
                </div>
              )}
              {management.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {management.map((entry) => (
                    <PersonCard key={entry.role.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </RevealWrapper>
  );
}
