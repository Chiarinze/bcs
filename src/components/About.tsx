export default function About() {
  return (
    <section id="about" className="py-20 px-4 bg-[#F0EFEA]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-serif text-center mb-12">About Us</h2>

        <div className="flex flex-col justify-center items-center gap-8">
          <div className="space-y-4">
            <p className="text-lg">
              The Benin Chorale & Philharmonic Nigeria Limited (BCS) is a
              distinguished ensemble of talented artists from diverse cultural
              and professional backgrounds. It is committed to inspiring and
              empowering musicians, particularly youths, through transformative
              music training, education, and global performance opportunities.
              Since its inception in 2012, BCS has grown to include over 70
              professional members from fields such as education, law, medicine,
              engineering, and the arts. It fosters a community rooted in
              diversity, inclusion, discipline, and personal development.
            </p>

            <p className="text-lg">
              BCS celebrates cultural harmony by showcasing African and global
              musical traditions, delivering exceptional concerts, and providing
              life-changing workshops. Dedicated to youth engagement and
              development, the organization encourages social responsibility,
              nurtures talent, and enriches the cultural and social fabric of
              communities through its commitment to music education, community
              service, and personal growth.
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center text-white gap-8">
            <div className="w-[100%] md:[50%] p-6 bg-[#98916D] rounded-lg shadow-sm">
              <h3 className="font-serif text-xl mb-2">Mission</h3>
              <p>
                To deliver transformative musical experiences through
                life-changing concerts, music training, and workshops, creating
                meaningful opportunities for young musicians to develop their
                skills and thrive. BCS is devoted to fostering diversity,
                inclusion, discipline, and personal growth, promoting youth
                engagement, and cultivating a deep appreciation for choral and
                orchestral music while contributing to community development and
                cultural enrichment.
              </p>
            </div>
            <div className="w-[100%] md:[50%] p-6 bg-[#98916D] rounded-lg shadow-sm">
              <h3 className="font-serif text-xl mb-2">Vision</h3>
              <p>
                To be a leading force in advancing music education, youth
                empowerment, and cultural appreciation across Africa. We aim to
                inspire global recognition of African chorale excellence,
                provide platforms for young musicians to thrive, and establish
                BCS as one of the top five chorale and philharmonic ensembles on
                the continent. Through our dedication to diversity, community
                service, and artistic excellence, we envision a future where
                music uplifts, unites and transforms lives.
              </p>
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
