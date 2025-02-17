import { Link } from "react-router-dom";
import { Arms, BoardOfDirectors, Management, PartLeaders } from "../db";

export default function About() {
  return (
    <section id="about" className="py-20 px-4 bg-[#F0EFEA]/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-serif text-center mb-12">About Us</h2>
        <div className="w-full h-[1px] bg-black mb-12" />

        <div className="flex flex-col justify-center items-center gap-8">
          <div className="space-y-4">
            <p className="">
              The Benin Chorale and Philharmonic Nigeria is a premier musical
              ensemble dedicated to the promotion, performance, and advancement
              of choral and orchestral music in Nigeria. Based in Benin City, we
              are committed to excellence in music-making, providing a platform
              for talented musicians to showcase their artistry while preserving
              and innovating within Nigeria’s rich musical traditions.
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
              Since its inception in *2012, we have presented over 16 concerts,
              both free and ticketed, to an average audience of 2,000 spectators
              in person and online.
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
                musicians, and contribute to the global appreciation of African
                classical and contemporary music.
              </p>
            </div>
            <div className="w-[100%] md:[50%] p-6 bg-[#98916D] rounded-lg shadow-sm">
              <h3 className="font-serif text-xl mb-2">Our Vision</h3>
              <p>
                To be a leading choral and orchestral ensemble in Nigeria and
                beyond, recognized for artistic excellence, musical innovation,
                and cultural preservation.
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
                  – Through outreach programs, workshops, and collaborations, we
                  bring music to diverse audiences and support cultural
                  initiatives.
                </p>
              </div>
              <div className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden p-6">
                <p className="font-serif mb-2">
                  <span className="font-semibold text-lg">
                    Annual Retreat & Special Events
                  </span>{" "}
                  – We host an annual retreat for musical development and offer
                  special concerts throughout the year.
                </p>
              </div>
              <div className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden p-6">
                <p className="font-serif mb-2">
                  <span className="font-semibold text-lg">
                    Cultural Exchange & Diversity
                  </span>{" "}
                  – We contribute to fostering cross-cultural harmony by
                  presenting musical works from diverse cultural sources, with a
                  special focus on African music.
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
                engagements, bringing our unique blend of musical excellence to
                audiences worldwide.
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
                We welcome singers, instrumentalists, and music enthusiasts who
                share our passion for choral and orchestral music. Whether
                you’re a seasoned musician or an aspiring artist, there’s a place for you at the Benin Chorale and Philharmonic Nigeria.
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
                  <img
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
                      to={`/board/${member.id}`}
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
                  <img
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

          {/* <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <h3 className="text-4xl font-bold text-blue-600 mb-2">70+</h3>
              <p className="text-gray-600">Professional Musicians</p>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <h3 className="text-4xl font-bold text-blue-600 mb-2">12+</h3>
              <p className="text-gray-600">Major Concerts</p>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <h3 className="text-4xl font-bold text-blue-600 mb-2">2k+</h3>
              <p className="text-gray-600">Average Spectators</p>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <h3 className="text-4xl font-bold text-blue-600 mb-2">2012</h3>
              <p className="text-gray-600">Year Founded</p>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
}
