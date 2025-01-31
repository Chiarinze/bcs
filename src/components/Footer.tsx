import { Facebook, Instagram, Youtube } from "lucide-react";

export default function Footer() {
  const contactIcons = [
    {
      name: "Facebook",
      icon: <Facebook size={32} />,
      link: "https://facebook.com/yourpage",
    },
    {
      name: "Instagram",
      icon: <Instagram size={32} />,
      link: "https://instagram.com/yourhandle",
    },
    {
      name: "Youtube",
      icon: <Youtube size={32} />,
      link: "https://instagram.com/yourhandle",
    },
  ];

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">BCS</h3>
            <p className="text-gray-400">
              Inspiring musical excellence since 2012
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Contact</h3>
            <p className="text-gray-400">Benin City, Edo State</p>
            <p className="text-gray-400">Nigeria</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Follow Us</h3>
            
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
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
            Nigeria. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
