"use client"

import { Arms, BoardOfDirectors, Management, PartLeaders } from "@/data";
import Image from "next/image";
import Link from "next/link";
import { RevealWrapper } from "@/components/RevealWrapper";
import Button from "@/components/ui/Button";

export default function About() {
  return (
    <RevealWrapper>
      <section className="bg-[#F9F9F7] py-24 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          {/* TITLE */}
          <div className="text-center mb-16" data-reveal>
            <h1 className="text-4xl md:text-5xl font-serif text-bcs-green mb-4">
              About Us
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The Benin Chorale and Philharmonic Nigeria — promoting musical
              excellence, education, and cultural preservation through choral
              and orchestral performances.
            </p>
          </div>

          {/* INTRO */}
          <div className="space-y-6 max-w-4xl mx-auto mb-16 text-gray-700 leading-relaxed">
            <p data-reveal>
              The Benin Chorale and Philharmonic Nigeria is a premier musical
              ensemble dedicated to the promotion, performance, and advancement
              of choral and orchestral music in Nigeria. Based in Benin City, we
              provide a platform for talented musicians to showcase their
              artistry while preserving and innovating within Nigeria’s rich
              musical traditions.
            </p>

            <p data-reveal>
              A group of artists from various musical and cultural backgrounds
              form the Benin Chorale & Philharmonic with the goal of inspiring
              and empowering young musicians — both established and aspiring —
              by elevating them to a global audience and steering them away from
              social vices. Our 70+ members come from diverse professional
              backgrounds, including medicine, education, engineering,
              technology, finance, law, and the arts.
            </p>

            <p data-reveal>
              Since our inception in 2012, we have presented over 16 concerts —
              both free and ticketed — to audiences of more than 2,000 people in
              person and online.
            </p>
          </div>

          {/* MISSION + VISION */}
          <div
            className="grid md:grid-cols-2 gap-8 text-white mb-20"
            data-reveal
          >
            <div className="bg-bcs-muted p-8 rounded-2xl shadow-sm hover-lift">
              <h3 className="font-serif text-2xl mb-3">Our Mission</h3>
              <p>
                We cultivate a vibrant musical culture through performances,
                education, and community engagement — inspiring audiences,
                nurturing talent, and contributing to the global appreciation of
                African music.
              </p>
            </div>

            <div className="bg-bcs-muted p-8 rounded-2xl shadow-sm hover-lift">
              <h3 className="font-serif text-2xl mb-3">Our Vision</h3>
              <p>
                To be a leading choral and orchestral ensemble in Nigeria and
                beyond — recognized for artistic excellence, musical innovation,
                and cultural preservation.
              </p>
            </div>
          </div>

          {/* WHAT WE DO */}
          <div className="mb-24" data-reveal>
            <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-10 text-center">
              What We Do
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Choral & Orchestral Performances",
                  desc: "We present diverse programs including classical masterpieces, African art music, contemporary works, and indigenous Nigerian pieces.",
                },
                {
                  title: "Music Education & Training",
                  desc: "We offer training for singers, instrumentalists, and conductors, fostering the next generation of skilled musicians.",
                },
                {
                  title: "Community Engagement",
                  desc: "We reach diverse audiences through outreach programs, workshops, and cultural collaborations.",
                },
                {
                  title: "Annual Retreat & Special Events",
                  desc: "We host annual retreats and special concerts for musical development and artistic growth.",
                },
                {
                  title: "Cultural Exchange & Diversity",
                  desc: "We foster cross-cultural harmony by presenting works from diverse traditions, with a focus on African music.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-bcs-accent text-white p-6 rounded-xl shadow-sm hover:shadow-md transition"
                >
                  <h4 className="font-serif text-xl mb-2">{item.title}</h4>
                  <p className="text-sm opacity-90">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* REPERTOIRE */}
          <div className="text-center mb-24 max-w-3xl mx-auto" data-reveal>
            <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-6">
              Our Musical Repertoire
            </h2>
            <p className="text-gray-700 mb-4">
              We perform a range of music — both sacred and secular — including:
            </p>
            <ul className="flex flex-wrap justify-center gap-3 text-bcs-green font-medium">
              {["Classical", "Pop", "Jazz", "Soul", "Folk", "African Traditional"].map(
                (style) => (
                  <li
                    key={style}
                    className="px-4 py-2 bg-[#F0EFEA] rounded-full border border-gray-200"
                  >
                    {style}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* SERVICES + JOIN US */}
          <div
            className="grid md:grid-cols-2 gap-8 text-white mb-24"
            data-reveal
          >
            <div className="bg-bcs-green p-8 rounded-2xl shadow-sm hover-lift">
              <h3 className="font-serif text-2xl mb-3">Our Services</h3>
              <p>
                We improve the quality of music in our community, create
                opportunities for collaboration, and contribute positively to
                society. We’re always open to partnering with like-minded
                organizations to advance our goals.
              </p>
            </div>

            <div className="bg-bcs-green p-8 rounded-2xl shadow-sm hover-lift">
              <h3 className="font-serif text-2xl mb-3">Join Us</h3>
              <p>
                We welcome singers, instrumentalists, and music enthusiasts who
                share our passion. Whether you’re a seasoned musician or an
                aspiring artist, there’s a place for you here.
              </p>
              <div className="mt-6">
                <Button
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-bcs-green"
                  onClick={() => (window.location.href = "/contact")}
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>

          {/* ARMS */}
          <div className="mb-24" data-reveal>
            <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-10 text-center">
              Our Arms
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Arms.map((arm) => (
                <div
                  key={arm.id}
                  className="bg-bcs-accent text-white p-6 rounded-xl shadow-sm hover:shadow-md"
                >
                  <h4 className="font-serif text-xl">{arm.title}</h4>
                </div>
              ))}
            </div>
          </div>

          {/* BOARD OF DIRECTORS */}
          <div className="mb-24" data-reveal>
            <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-10 text-center">
              Our Board of Directors
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              {BoardOfDirectors.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center text-center"
                >
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={160}
                    height={160}
                    className="rounded-full object-cover mb-4"
                  />
                  <h4 className="font-serif text-lg text-bcs-green">
                    {member.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {member.position}
                  </p>
                  <Link
                    href={`/about/board/${member.slug}`}
                    className="text-bcs-accent text-sm font-medium hover:underline"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* MANAGEMENT + PART LEADERS */}
          <div data-reveal>
            <h2 className="text-3xl md:text-4xl font-serif text-bcs-green mb-10 text-center">
              Our Management & Part Leaders
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {Management.map((m) => (
                <div
                  key={m.id}
                  className="bg-bcs-accent text-white p-6 rounded-xl shadow-sm hover:shadow-md"
                >
                  <p className="font-serif text-lg">{m.title}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              {PartLeaders.map((leader) => (
                <div
                  key={leader.id}
                  className="flex flex-col items-center text-center"
                >
                  <Image
                    src={leader.image}
                    alt={leader.name}
                    width={160}
                    height={160}
                    className="rounded-full object-cover mb-4"
                  />
                  <h4 className="font-serif text-lg text-bcs-green">
                    {leader.name}
                  </h4>
                  <p className="text-sm text-gray-600">{leader.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </RevealWrapper>
  );
}
