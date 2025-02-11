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
            <p className="text-lg">
              A group of artists from various musical and cultural backgrounds
              form the Benin Chorale & Philharmonic with the goal of inspiring
              and empowering young (established or aspiring) musicians by
              elevating them to a global audience and discouraging them from
              engaging in social vices. Over 70 musicians who work
              professionally in a variety of fields, including medicine,
              education, engineering, information technology, finance, law,
              business, humanities, etc., make up our membership
            </p>

            <p className="text-lg">
              Since its inception in 2012, we have presented over 12 concerts
              free and paid, to an average of 2000 spectators both physically
              and online. Young adults between the ages of 16 and 35 make up 60%
              of our audience, followed by adults between 40 and 75 at 40%.
            </p>

            <p className="text-lg">
              We contribute to fostering cross-cultural harmony by presenting
              musical works from many cultural sources, with a predilection for
              African music. We support excellent music of both religious and
              secular origins, including classical, pop, jazz, soul, folk etc.
              We accept invitations for both local and foreign engagements.
            </p>

            <p className="text-lg">
              Our services are designed to improve the quality of music
              available in our locality, attract profit and contribute to the
              society. While building our organizational framework, we are open
              to working with the best hands available in order to reach a
              status that is consistent with our goals and objectives.
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center text-white gap-8">
            <div className="w-[100%] md:[50%] p-6 bg-[#98916D] rounded-lg shadow-sm">
              <h3 className="font-serif text-xl mb-2">Mission</h3>
              <p>
                Life-changing concerts, job creation for chorale musicians and
                developing a culture of general chorale music appreciation.
              </p>
            </div>
            <div className="w-[100%] md:[50%] p-6 bg-[#98916D] rounded-lg shadow-sm">
              <h3 className="font-serif text-xl mb-2">Vision</h3>
              <p>
                Our goal is to spread music education across Africa, job
                creation for chorale musicians and to rank among the top 5
                chorales in Africa.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center gap-8">
            <div>
              <h3 className="font-serif text-2xl mb-2">Our Arms</h3>
              <div className="w-full h-[1px] bg-black" />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Arms.map((arm) => (
                <div
                  key={arm.id}
                  className="bg-[#B9704A] rounded-lg shadow-lg text-white overflow-hidden"
                >
                  <img
                    src={arm.image}
                    alt={arm.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="font-serif text-xl mb-2">{arm.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center items-center gap-8">
            <div>
              <h3 className="font-serif text-2xl mb-2">
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
                    <p className="font-serif text-black/50 text-sm">{member.position}</p>
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
              <h3 className="font-serif text-2xl mb-2">
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
            <h3 className="font-serif text-2xl mb-2">Meet our Part Leaders</h3>
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
                    <p className="font-serif text-black/50 text-sm">{partLeader.title}</p>
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
