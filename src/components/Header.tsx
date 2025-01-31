import { X, Menu } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 70,
        behavior: "smooth",
      });
    }
  };

  const handleScrollBookUs = () => {
    const aboutSection = document.getElementById("contact-us");
    if (aboutSection) {
      window.scrollTo({
        top: aboutSection.offsetTop - 70,
        behavior: "smooth",
      });
    }
  };

  const navigation = [
    { name: "Home", href: "hero" },
    { name: "About", href: "about" },
    { name: "Performances", href: "performances" },
    { name: "Contact", href: "contact-us" },
    // { name: "Contact", href: "contact" },
  ];

  return (
    <nav
      className={`w-full py-2 fixed top-0 left-0 right-0 z-50 shadow-sm backdrop-blur-sm transition-colors duration-300 ${
        isScrolled ? "bg-[#98916D]" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <img
            src="/bcslogo.jpeg"
            alt="BCS"
            className="w-14 h-14 rounded-full"
          />

          <div className="flex items-center justify-between gap-4">
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={`#${item.href}`}
                    onClick={(e) => handleSmoothScroll(e, item.href)}
                    className="text-white hover:text-emerald-500 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>

            <button
              onClick={handleScrollBookUs}
              className="w-38 bg-[#415C41] text-white px-8 py-3 rounded-xl hover:opacity-80 transition-opacity"
            >
              Book us
            </button>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-emerald-500 focus:outline-none"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={`#${item.href}`}
                onClick={(e) => handleSmoothScroll(e, item.href)}
                className="block px-3 py-2 text-base font-medium text-white hover:text-emerald-500"
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
