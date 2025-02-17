interface Performance {
  id: number;
  title: string;
  date?: string;
  location?: string;
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
  },
  {
    id: 2,
    title: "Easter Virtual Concert",
    date: "17th April, 2023",
    location: "Online",
    image: "/evc.jpg",
  },
  {
    id: 3,
    title: "Moment of Worship",
    date: "30th July, 2023",
    location: "Victor Uwaifo Creative Hub",
    image: "/mow.jpg",
    link: "https://www.facebook.com/share/v/17X9VNSGyG/?mibextid=wwXIfr"
  },
  {
    id: 4,
    title: "Handel's Messiah Concert",
    date: "28th April, 2024",
    location: "Victor Uwaifo Creative Hub",
    image: "/hmc.jpg",
    link: "https://www.facebook.com/share/v/15c63Eiz3p/?mibextid=wwXIfr"
  },
  {
    id: 5,
    title: "Christmas with Brojays and Friends",
    date: "1st December, 2024",
    location: "Victor Uwaifo Creative Hub",
    image: "/cbf.jpg",
    link: "https://www.facebook.com/share/v/15ksCVNnPN/?mibextid=wwXIfr"
  },
  {
    id: 6,
    title: "Birthday Thanksgiving of Sir. Allan Omorogbe",
    date: "1st December, 2024",
    location: "Victor Uwaifo Creative Hub",
    image: "/birthday.jpg",
    link: "https://www.facebook.com/share/v/1E9FyyVZUL/?mibextid=wwXIfr"
  },
];

export default function Performances() {
  return (
    <section id="performances" className="py-20 px-4 bg-[#F0EFEA]">
      <div className="flex flex-col justify-center items-center gap-8 mx-auto">
        <h2 className="text-3xl font-serif text-center mb-12">Past Performances</h2>
        <div className="w-full h-[1px] bg-black mb-12" />
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performances.map((performance) => (
            <div key={performance.id} className="bg-[#415C41] rounded-lg shadow-lg text-white w-90 overflow-hidden">
              <img src={performance.image} alt={performance.title} className="w-full h-48 object-cover"/>
              <div className="p-6">
                <h3 className="font-serif text-xl mb-2">{performance.title}</h3>
                {/* <p className="mb-2">{performance.date}</p> */}
                {performance.link && (
                  <a href={performance.link} className="text-yellow-500 font-semibold hover:underline">
                    Watch Excerpt from Performance
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}