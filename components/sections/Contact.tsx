import { Phone, Facebook, Mail, Instagram } from "lucide-react";
import { RevealWrapper } from "@/components/RevealWrapper";
import ContactForm from "@/components/sections/ContactForm";
import type { ContactContent } from "@/types";

interface Props {
  content: ContactContent;
}

const SERVICE_COLORS = ["bg-bcs-green", "bg-bcs-accent", "bg-[#415C41]", "bg-[#98916D]"];

export default function Contact({ content }: Props) {
  const contactOptions = [
    content.phone && {
      name: "Phone",
      icon: <Phone size={28} />,
      link: `tel:${content.phone.replace(/\s+/g, "")}`,
      color: "bg-bcs-green",
      external: false,
    },
    content.email && {
      name: "Email",
      icon: <Mail size={28} />,
      link: `mailto:${content.email}`,
      color: "bg-bcs-accent",
      external: false,
    },
    content.facebook && {
      name: "Facebook",
      icon: <Facebook size={28} />,
      link: content.facebook,
      color: "bg-[#3b5998]",
      external: true,
    },
    content.instagram && {
      name: "Instagram",
      icon: <Instagram size={28} />,
      link: content.instagram,
      color: "bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#962fbf]",
      external: true,
    },
  ].filter((o): o is Exclude<typeof o, "" | false> => Boolean(o));

  return (
    <RevealWrapper>
      <section className="bg-[#F9F9F7] py-24 md:py-28 px-4">
        <div className="max-w-7xl mx-auto text-center">
          {/* HEADER */}
          <div className="mb-16" data-reveal>
            <h1 className="text-4xl md:text-5xl font-serif text-bcs-green mb-4">
              Contact Us
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">{content.tagline}</p>
          </div>

          {/* CONTACT OPTIONS */}
          {contactOptions.length > 0 && (
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 justify-center items-center mb-20"
              data-reveal
            >
              {contactOptions.map((contact) => (
                <a
                  key={contact.name}
                  href={contact.link}
                  target={contact.external ? "_blank" : "_self"}
                  rel={contact.external ? "noopener noreferrer" : undefined}
                  className={`flex flex-col items-center justify-center gap-3 text-white rounded-2xl shadow-md hover:shadow-lg transition hover-lift py-8 ${contact.color}`}
                >
                  <div>{contact.icon}</div>
                  <span className="font-medium">{contact.name}</span>
                </a>
              ))}
            </div>
          )}

          {/* DESCRIPTION */}
          {content.description && (
            <div
              className="max-w-3xl mx-auto text-gray-700 leading-relaxed mb-16"
              data-reveal
            >
              <p>{content.description}</p>
            </div>
          )}

          {/* CONTACT FORM */}
          <div className="max-w-3xl mx-auto mb-24" data-reveal>
            <h2 className="text-2xl font-serif text-bcs-green mb-6">
              Send us a message
            </h2>
            <ContactForm />
          </div>

          {/* DIGITAL SERVICES */}
          {content.digital_services.length > 0 && (
            <div className="text-center" data-reveal>
              <h2 className="text-2xl font-serif text-bcs-green mb-6">
                Our Digital Services
              </h2>
              {content.digital_services_intro && (
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  {content.digital_services_intro}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-4">
                {content.digital_services.map((label, i) => (
                  <span
                    key={label}
                    className={`text-sm text-white px-5 py-2 rounded-full ${SERVICE_COLORS[i % SERVICE_COLORS.length]}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>
    </RevealWrapper>
  );
}
