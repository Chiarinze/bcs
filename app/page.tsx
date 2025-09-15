import { IMAGES } from "@/assets/images";
import {
  Arms,
  BoardOfDirectors,
  Management,
  PartLeaders,
  performances,
} from "@/data";
import Image from "next/image";
import Link from "next/link";
import { Phone, Facebook, Mail, Instagram } from "lucide-react";

export default function Home() {
  const contactIcons = [
    { name: "Phone", icon: <Phone size={32} />, link: "tel:+2348078742682" },
    {
      name: "Email",
      icon: <Mail size={32} />,
      link: "mailto:Info@beninchoraleandphilharmonic.com",
    },
    {
      name: "Facebook",
      icon: <Facebook size={32} />,
      link: "https://web.facebook.com/BcsNig/?_rdc=1&_rdr#",
    },
    {
      name: "Instagram",
      icon: <Instagram size={32} />,
      link: "https://www.instagram.com/the_benin_chorale_society/?igsh=MXVybmpseXkxOGQwZg%3D%3D",
    },
  ];


  return (
    <div>
      <section
        id="hero"
        className="relative w-full min-h-screen flex justify-center items-center bg-cover bg-center"
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${IMAGES.bcs4.src})`,
          }}
        >
          <div className="absolute inset-0 bg-black opacity-70"></div>
        </div>

        <div className="relative w-full h-full flex flex-col items-center justify-center text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Musical Excellence:
            <br />
            Where Passion Meets Performance
          </h1>
          <p className="text-lg md:text-xl max-w-3xl">
            Inspiring and empowering young musicians through excellence in
            choral and orchestral performance
          </p>
          <div className="space-x-4">
            <button className="w-38 mt-8 mb-20 border-2 border-[#415C41] bg-transparent shadow-sm backdrop-blur-sm text-white px-8 py-3 rounded-xl hover:bg-[#415C41]">
              Learn more
            </button>
            <button className="w-38 mt-8 mb-20 bg-[#415C41] text-white px-8 py-3 rounded-xl hover:opacity-80 transition-opacity">
              Book us
            </button>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 px-4 bg-[#F0EFEA]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif text-center mb-12">About Us</h2>
          <div className="w-full h-[1px] bg-black mb-12" />

          <div className="flex flex-col justify-center items-center gap-8">
            <div className="space-y-4">
              <p className="">
                The Benin Chorale and Philharmonic Nigeria is a premier musical
                ensemble dedicated to the promotion, performance, and
                advancement of choral and orchestral music in Nigeria. Based in
                Benin City, we are committed to excellence in music-making,
                providing a platform for talented musicians to showcase their
                artistry while preserving and innovating within Nigeria’s rich
                musical traditions.
              </p>

              <p className="">
                A group of artists from various musical and cultural backgrounds
                form the Benin Chorale & Philharmonic with the goal of inspiring
                and empowering young (established or aspiring) musicians by
                elevating them to a global audience and discouraging them from
                engaging in social vices. Over *70 musicians* who work
                professionally in a variety of fields—including medicine,
                education, engineering, information technology, finance, law,
                business, and humanities—make up our membership.
              </p>

              <p className="">
                Since its inception in *2012, we have presented over 16
                concerts, both free and ticketed, to an average audience of
                2,000 spectators in person and online.
              </p>

              {/* <p className="text-lg">
      Our services are designed to improve the quality of music
      available in our locality, attract profit and contribute to the
      society. While building our organizational framework, we are open
      to working with the best hands available in order to reach a
      status that is consistent with our goals and objectives.
    </p> */}
            </div>

            <div className="grid md:grid-cols-2 text-white gap-8">
              <div className="w-[100%] md:[50%] p-6 bg-[#98916D] rounded-lg shadow-sm">
                <h3 className="font-serif text-xl mb-2">Our Mission</h3>
                <p>
                  We seek to cultivate a vibrant musical culture through
                  high-quality performances, music education, and community
                  engagement. Our goal is to inspire audiences, nurture young
                  musicians, and contribute to the global appreciation of
                  African classical and contemporary music.
                </p>
              </div>
              <div className="w-[100%] md:[50%] p-6 bg-[#98916D] rounded-lg shadow-sm">
                <h3 className="font-serif text-xl mb-2">Our Vision</h3>
                <p>
                  To be a leading choral and orchestral ensemble in Nigeria and
                  beyond, recognized for artistic excellence, musical
                  innovation, and cultural preservation.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center gap-8">
              <div>
                <h3 className="font-serif text-2xl mt-10 mb-2">What We Do</h3>
                <div className="w-full h-[1px] bg-black" />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden p-6">
                  <p className="font-serif mb-2">
                    <span className="font-semibold text-lg">
                      Choral and Orchestral Performances
                    </span>{" "}
                    – We present diverse programs, including classical
                    masterpieces, African art music, contemporary compositions,
                    and indigenous Nigerian works.
                  </p>
                </div>
                <div className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden p-6">
                  <p className="font-serif mb-2">
                    <span className="font-semibold text-lg">
                      Music Education & Training
                    </span>{" "}
                    – We offer training programs for singers, instrumentalists,
                    and conductors, fostering a new generation of skilled
                    musicians.
                  </p>
                </div>
                <div className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden p-6">
                  <p className="font-serif mb-2">
                    <span className="font-semibold text-lg">
                      Community Engagement
                    </span>{" "}
                    – Through outreach programs, workshops, and collaborations,
                    we bring music to diverse audiences and support cultural
                    initiatives.
                  </p>
                </div>
                <div className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden p-6">
                  <p className="font-serif mb-2">
                    <span className="font-semibold text-lg">
                      Annual Retreat & Special Events
                    </span>{" "}
                    – We host an annual retreat for musical development and
                    offer special concerts throughout the year.
                  </p>
                </div>
                <div className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden p-6">
                  <p className="font-serif mb-2">
                    <span className="font-semibold text-lg">
                      Cultural Exchange & Diversity
                    </span>{" "}
                    – We contribute to fostering cross-cultural harmony by
                    presenting musical works from diverse cultural sources, with
                    a special focus on African music.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center gap-8">
              <div>
                <h3 className="font-serif text-2xl mt-10 mb-2">
                  Our Musical Repertoire
                </h3>
                <div className="w-full h-[1px] bg-black" />
              </div>

              <div>
                <p>
                  We support and perform excellent music from both religious and
                  secular origins, including:
                </p>
                <ul className="list-disc list-inside pl-4">
                  <li>Classical</li>
                  <li>Pop</li>
                  <li>Jazz</li>
                  <li>Soul</li>
                  <li>Folk</li>
                  <li>African Traditional Music</li>
                </ul>
                <p>
                  We accept invitations for both local and international
                  engagements, bringing our unique blend of musical excellence
                  to audiences worldwide.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 text-white gap-8">
              <div className="w-[100%] md:[50%] p-6 bg-[#415C41] rounded-lg shadow-sm">
                <h3 className="font-serif text-xl mb-2">Our Services</h3>
                <p>
                  Our services are designed to improve the quality of music
                  available in our locality, generate revenue, and contribute
                  positively to society. While building our organizational
                  framework, we are open to collaborating with the best minds to
                  achieve a status that aligns with our goals and objectives.
                </p>
              </div>
              <div className="w-[100%] md:[50%] p-6 bg-[#415C41] rounded-lg shadow-sm">
                <h3 className="font-serif text-xl mb-2">Join Us</h3>
                <p>
                  We welcome singers, instrumentalists, and music enthusiasts
                  who share our passion for choral and orchestral music. Whether
                  you’re a seasoned musician or an aspiring artist, there’s a
                  place for you at the Benin Chorale and Philharmonic Nigeria.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center gap-8">
              <div>
                <h3 className="font-serif text-2xl mt-10 mb-2">Our Arms</h3>
                <div className="w-full h-[1px] bg-black" />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Arms.map((arm) => (
                  <div
                    key={arm.id}
                    className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden"
                  >
                    {/* <img
              src={arm.image}
              alt={arm.title}
              className="w-full h-48 object-cover"
            /> */}
                    <div className="p-6">
                      <h3 className="font-serif text-xl mb-2">{arm.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center items-center gap-8">
              <div>
                <h3 className="font-serif text-2xl mt-10 mb-2">
                  Our Board of Directors
                </h3>
                <div className="w-full h-[1px] bg-black" />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {BoardOfDirectors.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col justify-center items-center text-center"
                  >
                    <Image
                      src={member.image}
                      alt={member.position}
                      className="w-50 rounded-full h-50 object-cover"
                    />
                    <div className="p-6">
                      <h3 className="font-serif text-xl">{member.name}</h3>
                      <p className="font-serif text-black/50 text-sm">
                        {member.position}
                      </p>
                      <Link
                        href={`/board/${member.id}`}
                        className="text-blue-500 underline"
                      >
                        Learn More
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center items-center gap-8">
              <div>
                <h3 className="font-serif text-2xl mt-10 mb-2">
                  Our Management Bodies
                </h3>
                <div className="w-full h-[1px] bg-black" />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Management.map((management) => (
                  <div
                    key={management.id}
                    className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden"
                  >
                    <div className="p-6">
                      <p className="font-serif mb-2">{management.title}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-serif text-2xl mt-10 mb-2">
                  Meet our Part Leaders
                </h3>
                <div className="w-full h-[1px] bg-black" />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PartLeaders.map((partLeader) => (
                  <div
                    key={partLeader.id}
                    className="flex flex-col justify-center items-center text-center"
                  >
                    <Image
                      src={partLeader.image}
                      alt={partLeader.title}
                      className="w-50 rounded-full h-50 object-cover"
                    />
                    <div className="p-6">
                      <h3 className="font-serif text-xl">{partLeader.name}</h3>
                      <p className="font-serif text-black/50 text-sm">
                        {partLeader.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="performances" className="py-20 px-4 bg-[#F0EFEA]">
        <div className="flex flex-col justify-center items-center gap-8 mx-auto">
          <h2 className="text-3xl font-serif text-center mb-12">
            Past Performances
          </h2>
          <div className="w-full h-[1px] bg-black mb-12" />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {performances.map((performance) => (
              <div
                key={performance.id}
                className="bg-[#415C41] rounded-lg shadow-lg text-white w-90 overflow-hidden"
              >
                <Image
                  src={performance.image}
                  alt={performance.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="font-serif text-xl mb-2">
                    {performance.title}
                  </h3>
                  {/* <p className="mb-2">{performance.date}</p> */}
                  {performance.link && (
                    <a
                      href={performance.link}
                      className="text-yellow-500 font-semibold hover:underline"
                    >
                      Watch Excerpt from Performance
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 px-4 bg-[#98916D]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-serif text-center mb-12">For Bookings</h2>
        <div className="w-full h-[1px] bg-black mb-12" />

        <div className="flex flex-col justify-center items-center gap-6">
          <p>
            We perform as a chorale, orchestra, band, and theatre group at any
            event. Each year, we host a number of concerts. For bookings or more
            information on our services and performances, you can reach us on
            any of these platforms:
          </p>
          <div className="flex gap-8">
            {contactIcons.map((contact, index) => (
              <a
                key={index}
                href={contact.link}
                target={contact.name !== "Phone" ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="p-4 w-18 h-18 flex flex-col bg-gray-900 items-center rounded-xl text-white hover:text-gray-200 transition-all"
              >
                {contact.icon}
                <span className="text-xs mt-2">{contact.name}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <p className="mb-6">We also offer digital services like:</p>
          <div className="w-full flex justify-center items-center gap-4 text-white text-[9px]">
            <span className="px-4 py-2 rounded-full bg-[#415C41]">
              Social Media Management
            </span>
            <span className="px-4 py-2 rounded-full bg-[#B9704A]">
              Graphics Designing
            </span>
            <span className="px-4 py-2 rounded-full bg-gray-900">
              Video Editing
            </span>
            <span className="px-4 py-2 rounded-full bg-[#00423D]">
              Software/Website Development
            </span>
          </div>
        </div>
      </div>
    </section>
    </div>
  );
}
