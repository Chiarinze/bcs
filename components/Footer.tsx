import { Facebook, Instagram, Youtube } from "lucide-react";

export const Footer = () => {
    const contactIcons = [
    {
      name: "Facebook",
      icon: <Facebook size={30} />,
      link: "https://web.facebook.com/BcsNig/?_rdc=1&_rdr#",
    },
    {
      name: "Instagram",
      icon: <Instagram size={30} />,
      link: "https://www.instagram.com/the_benin_chorale_society/?igsh=MXVybmpseXkxOGQwZg%3D%3D",
    },
    {
      name: "Youtube",
      icon: <Youtube size={30} />,
      link: "https://www.youtube.com/@beninchoraleandphilharmonic?app=desktop&si=7qcI3YtsV7aVOYkL",
    },
  ];

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2">
          <div>
            <h3 className="font-bold mb-4">BCS</h3>
            <p className="text-gray-400 text-sm">
              Inspiring musical excellence since 2012
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-4">Contact</h3>
            <p className="text-gray-400 text-sm">Benin City, Edo State, Nigeria</p>
          </div>
          <div>
            <h3 className="font-bold my-4">Follow Us</h3>
            
            <div className="flex space-x-4">
            {contactIcons.map((contact, index) => (
              <a
                key={index}
                href={contact.link}
                target={contact.name !== "Phone" ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="w-6 h-6 text-gray-400"
              >
                {contact.icon}
              </a>
            ))}
          </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
            Nigeria. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
