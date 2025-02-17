import { Phone, Facebook, Mail, Instagram } from "lucide-react";

export default function BookUs() {
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
    <section id="contact-us" className="py-20 px-4 bg-[#98916D]">
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
  );
}
