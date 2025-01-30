interface Performance {
  id: number;
  title: string;
  date: string;
  location: string;
  image: string;
  link?: string;
}

const performances: Performance[] = [
  {
    id: 1,
    title: "10th Anniversary Concert",
    date: "4th September, 2022",
    location: "Benin City",
    image: "/bcs4.jpg",
    link: "https://fb.watch/rEnmQGNiMR/"
  },
  {
    id: 2,
    title: "Easter Virtual Concert",
    date: "17th April, 2023",
    location: "Online",
    image: "/bcs4.jpg",
    link: "https://fb.watch/rEpFigWLn4/"
  },
  {
    id: 3,
    title: "Festival of Worship",
    date: "30th July, 2023",
    location: "Victor Uwaifo Creative Hub",
    image: "/bcs4.jpg",
    link: "https://fb.watch/rErejCsVNY/"
  },
  {
    id: 4,
    title: "Handel's Messiah Concert",
    date: "28th April, 2024",
    location: "Victor Uwaifo Creative Hub",
    image: "/bcs4.jpg",
    link: "https://fb.watch/rErejCsVNY/"
  },
  {
    id: 5,
    title: "Christmas with Brojays and Friends",
    date: "1st December, 2024",
    location: "Victor Uwaifo Creative Hub",
    image: "/bcs4.jpg",
    link: "https://fb.watch/rErejCsVNY/"
  },
];

export default function Performances() {
  return (
    <section id="performances" className="py-20 px-4 bg-[#F0EFEA]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-serif text-center mb-12">Past Performances</h2>
        
        <div className="flex flex-wrap justify-center items-center xl:w-full gap-6">
          {performances.map((performance) => (
            <div key={performance.id} className="bg-[#415C41] rounded-lg shadow-lg text-white w-90 h-90 md:w-2/5 lg:w-1/4 overflow-hidden">
              <img src={performance.image} alt={performance.title} className="w-full h-48 object-cover"/>
              <div className="p-6">
                <h3 className="font-serif text-xl mb-2">{performance.title}</h3>
                <p className="mb-2">{performance.date}</p>
                {/* <a href={performance.link} className="text-blue-600 hover:underline">
                  Watch Performance
                </a> */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}