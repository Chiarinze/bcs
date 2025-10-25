"use client";

import { Phone, Facebook, Mail, Instagram } from "lucide-react";
import { RevealWrapper } from "@/components/RevealWrapper";
import Button from "@/components/ui/Button";

export default function Contact() {
  const contactOptions = [
    {
      name: "Phone",
      icon: <Phone size={28} />,
      link: "tel:+2348078742682",
      color: "bg-bcs-green",
    },
    {
      name: "Email",
      icon: <Mail size={28} />,
      link: "mailto:info@beninchoraleandphilharmonic.com",
      color: "bg-bcs-accent",
    },
    {
      name: "Facebook",
      icon: <Facebook size={28} />,
      link: "https://web.facebook.com/BcsNig/?_rdc=1&_rdr#",
      color: "bg-[#3b5998]",
    },
    {
      name: "Instagram",
      icon: <Instagram size={28} />,
      link: "https://www.instagram.com/the_benin_chorale_society/?igsh=MXVybmpseXkxOGQwZg%3D%3D",
      color: "bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#962fbf]",
    },
  ];

  return (
    <RevealWrapper>
      <section className="bg-[#F9F9F7] py-24 md:py-28 px-4">
        <div className="max-w-7xl mx-auto text-center">
          {/* HEADER */}
          <div className="mb-16" data-reveal>
            <h1 className="text-4xl md:text-5xl font-serif text-bcs-green mb-4">
              Contact Us
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We’d love to hear from you. Whether for bookings, collaborations,
              or general inquiries — reach out and let’s make music together.
            </p>
          </div>

          {/* CONTACT OPTIONS */}
          <div
            className="grid md:grid-cols-4 gap-8 justify-center items-center mb-20"
            data-reveal
          >
            {contactOptions.map((contact) => (
              <a
                key={contact.name}
                href={contact.link}
                target={
                  contact.name === "Phone" || contact.name === "Email"
                    ? "_self"
                    : "_blank"
                }
                rel="noopener noreferrer"
                className={`flex flex-col items-center justify-center gap-3 text-white rounded-2xl shadow-md hover:shadow-lg transition hover-lift py-8 ${contact.color}`}
              >
                <div>{contact.icon}</div>
                <span className="font-medium">{contact.name}</span>
              </a>
            ))}
          </div>

          {/* DESCRIPTION */}
          <div
            className="max-w-3xl mx-auto text-gray-700 leading-relaxed mb-20"
            data-reveal
          >
            <p>
              We perform as a chorale, orchestra, band, and theatre group at
              various events throughout the year. For bookings or more
              information on our performances and services, contact us via any
              of the platforms above.
            </p>
          </div>

          {/* DIGITAL SERVICES */}
          <div className="text-center" data-reveal>
            <h2 className="text-2xl font-serif text-bcs-green mb-6">
              Our Digital Services
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              In addition to music, we offer creative digital services through
              our in-house BCS Digital Consult team:
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {[
                { label: "Social Media Management", color: "bg-bcs-green" },
                { label: "Graphics Design", color: "bg-bcs-accent" },
                { label: "Video Editing", color: "bg-[#415C41]" },
                {
                  label: "Software / Website Development",
                  color: "bg-[#98916D]",
                },
              ].map((service) => (
                <span
                  key={service.label}
                  className={`text-sm text-white px-5 py-2 rounded-full ${service.color}`}
                >
                  {service.label}
                </span>
              ))}
            </div>

            <div className="mt-12">
              <Button
                variant="primary"
                className="px-8 py-3"
                onClick={() =>
                  (window.location.href =
                    "mailto:info@beninchoraleandphilharmonic.com")
                }
              >
                Send us a message
              </Button>
            </div>
          </div>
        </div>
      </section>
    </RevealWrapper>
  );
}
