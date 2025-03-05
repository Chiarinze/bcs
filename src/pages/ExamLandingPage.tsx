import React from 'react';
import { Link } from 'react-router-dom';

const ExamLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom Header for Exam Page */}
      <header className="bg-[#283339] text-white py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">BIMA</h1>
          </div>
          <nav>
            <Link 
              to="/exam-registration" 
              className="bg-[#70393f] hover:bg-[#8a474f] text-white py-2 px-4 rounded-md transition duration-300"
            >
              Register Now
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-[#70393f] text-center">BIMA Graded Examinations</h2>
          <p className="max-w-3xl mx-auto text-lg text-center text-gray-700 mb-8">
            BIMA offers comprehensive graded examinations to assess and certify your musical proficiency. 
            Our examinations are designed to evaluate both practical skills and theoretical knowledge.
          </p>
          <div className="text-center">
            <Link 
              to="/exam-registration" 
              className="inline-block bg-[#70393f] hover:bg-[#8a474f] text-white font-bold py-3 px-6 rounded-md transition duration-300"
            >
              Register for an Examination
            </Link>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-12">
          <h3 className="text-2xl font-bold mb-4 text-[#283339]">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow text-center">
              <h4 className="font-bold text-lg">Grade 1-2</h4>
              <p className="text-2xl font-bold text-[#70393f] my-2">₦10,000 - ₦18,000</p>
              <p className="text-gray-600">Basic proficiency</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow text-center">
              <h4 className="font-bold text-lg">Grade 3-4</h4>
              <p className="text-2xl font-bold text-[#70393f] my-2">₦26,000 - ₦34,000</p>
              <p className="text-gray-600">Developing proficiency</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow text-center">
              <h4 className="font-bold text-lg">Grade 5-6</h4>
              <p className="text-2xl font-bold text-[#70393f] my-2">₦42,000 - ₦51,000</p>
              <p className="text-gray-600">Intermediate proficiency</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow text-center">
              <h4 className="font-bold text-lg">Grade 7-8</h4>
              <p className="text-2xl font-bold text-[#70393f] my-2">₦60,000 - ₦69,999</p>
              <p className="text-gray-600">Advanced proficiency</p>
            </div>
          </div>
        </section>

        {/* General Requirements Section */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-12">
          <h3 className="text-2xl font-bold mb-4 text-[#283339]">General Requirements</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Instrument: Candidates must choose an instrument to specialize in (e.g., piano, guitar, violin, etc.).</li>
            <li>Theory: Candidates may be required to pass a music theory examination in addition to their practical instrument examination.</li>
          </ul>
        </section>

        {/* Practical Examination Requirements */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-12">
          <h3 className="text-2xl font-bold mb-4 text-[#283339]">Practical Examination Requirements</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Repertoire: Candidates must prepare and perform a specific repertoire of pieces for their instrument and grade level.</li>
            <li>Technique: Candidates must demonstrate technical proficiency on their instrument, including scales, arpeggios, and other technical exercises.</li>
            <li>Sight-Reading: Candidates may be required to sight-read a piece of music on their instrument.</li>
            <li>Ear Tests: Candidates may be required to complete ear tests, such as identifying intervals, chord progressions, or melodies.</li>
          </ul>
        </section>

        {/* Theory Examination Requirements */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-12">
          <h3 className="text-2xl font-bold mb-4 text-[#283339]">Theory Examination Requirements</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Music Notation: Candidates must demonstrate an understanding of music notation, including reading and writing notes, rests, dynamics, and articulations.</li>
            <li>Music Theory: Candidates must demonstrate an understanding of music theory concepts, such as chord progressions, harmony, and counterpoint.</li>
            <li>History of Music: Candidates may be required to demonstrate knowledge of the history of music, including different periods, styles, and composers.</li>
          </ul>
        </section>

        {/* Grade-Specific Requirements */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-12">
          <h3 className="text-2xl font-bold mb-4 text-[#283339]">Grade-Specific Requirements</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-[#70393f] pl-4">
              <h4 className="font-bold">Grade 1-3:</h4>
              <p>Candidates must demonstrate basic technical proficiency and knowledge of music theory.</p>
            </div>
            <div className="border-l-4 border-[#70393f] pl-4">
              <h4 className="font-bold">Grade 4-6:</h4>
              <p>Candidates must demonstrate intermediate technical proficiency and knowledge of music theory.</p>
            </div>
            <div className="border-l-4 border-[#70393f] pl-4">
              <h4 className="font-bold">Grade 7-8:</h4>
              <p>Candidates must demonstrate advanced technical proficiency and knowledge of music theory.</p>
            </div>
            <div className="border-l-4 border-[#70393f] pl-4">
              <h4 className="font-bold">Diploma:</h4>
              <p>Candidates must demonstrate exceptional technical proficiency and knowledge of music theory, as well as a deep understanding of musical interpretation and performance.</p>
            </div>
          </div>
        </section>

        {/* Specific Instrument Requirements */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-6 text-[#283339] text-center">Instrument-Specific Requirements</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Voice Requirements */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-xl font-bold mb-4 text-[#70393f]">Voice Students</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-medium">Repertoire:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Prepare 2-3 songs from different periods/styles (e.g., classical, musical theater, jazz).</li>
                    <li>Songs should demonstrate vocal range, tone, and expression.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium">Technical Exercises:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Vocal warm-ups (e.g., lip trills, tongue trills, scales).</li>
                    <li>Breath control exercises (e.g., sustained tones, dynamics).</li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium">Sight-Singing:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Prepare to sight-sing a simple melody or harmony.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium">Aural Tests:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Identify intervals, chord progressions, or melodies.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium">Performance:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Demonstrate good posture, breathing, and vocal technique.</li>
                    <li>Communicate the lyrics and emotions of the songs.</li>
                  </ul>
                </li>
              </ul>
            </div>

            {/* Piano Requirements */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="text-xl font-bold mb-4 text-[#70393f]">Piano Students</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-medium">Repertoire:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Prepare 2-3 pieces from different periods/styles (e.g., Baroque, Classical, Romantic).</li>
                    <li>Pieces should demonstrate technical skill, tone, and expression.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium">Technical Exercises:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Scales (major, minor, harmonic, melodic).</li>
                    <li>Arpeggios (broken chords played in a smooth, flowing manner).</li>
                    <li>Other technical exercises (e.g., Hanon, Czerny).</li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium">Sight-Reading:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Prepare to sight-read a simple piece or exercise.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium">Aural Tests:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Identify intervals, chord progressions, or melodies.</li>
                  </ul>
                </li>
                <li>
                  <span className="font-medium">Performance:</span>
                  <ul className="list-circle pl-6 mt-1">
                    <li>Demonstrate good hand position, finger independence, and pedaling technique.</li>
                    <li>Communicate the melody, harmony, and rhythm of the pieces.</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-4 font-bold text-[#283339]">All performances must be from memory, without the use of scores or sheet music.</p>
            </div>
          </div>
        </section>

        <div className="text-center mb-12">
          <Link 
            to="/exam-registration" 
            className="inline-block bg-[#70393f] hover:bg-[#8a474f] text-white font-bold py-3 px-6 rounded-md transition duration-300"
          >
            Register for an Examination
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#283339] text-white py-6">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p>© {new Date().getFullYear()} BIMA. All rights reserved.</p>
            <p className="mt-2 text-sm">For inquiries, please contact support@bima.org</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ExamLandingPage;