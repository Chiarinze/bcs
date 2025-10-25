import React from "react";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import { Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-[#F9F9F7] border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-12">
        {/* Brand / Logo */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full overflow-hidden w-14 h-14 bg-white shadow-sm flex items-center justify-center">
              <Image
                src={IMAGES.logo}
                alt="BCS logo"
                width={56}
                height={56}
                priority
              />
            </div>
            <span className="font-serif text-lg text-gray-900 tracking-tight">
              Benin Chorale & Philharmonic
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
            Enriching lives through timeless music — bringing harmony, passion,
            and artistry to audiences across Nigeria and beyond.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="font-serif text-lg text-bcs-green mb-3">
            Quick Links
          </h4>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            {[
              { label: "Home", href: "/" },
              { label: "About", href: "/about" },
              { label: "Performances", href: "/performances" },
              { label: "Events", href: "/events" },
              { label: "Contact", href: "/contact" },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="hover:text-bcs-accent transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="font-serif text-lg text-bcs-green mb-3">
            Get in Touch
          </h4>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-bcs-accent" />
              <a
                href="mailto:info@beninchoraleandphilharmonic.com"
                className="hover:underline"
              >
                info@beninchoraleandphilharmonic.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-bcs-accent" />
              <a href="tel:+2348078742682" className="hover:underline">
                +234 807 874 2682
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-bcs-accent" />
              <span>Benin City, Nigeria</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic. All
          rights reserved.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Designed with ❤️ by BCS Digital Consult
        </p>
      </div>
    </footer>
  );
};
