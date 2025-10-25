"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Menu } from "lucide-react";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import clsx from "clsx";
import Link from "next/link";
import Button from "@/components/ui/Button";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen && menuButtonRef.current) menuButtonRef.current.focus();
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen((v) => !v);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Performances", href: "/performances" },
    { name: "Events", href: "/events" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header
      className={clsx(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300 backdrop-blur-md",
        isScrolled ? "bg-white/80 shadow-sm py-3" : "bg-transparent py-4"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-full overflow-hidden flex items-center justify-center w-12 h-12 bg-white shadow-sm">
            <Image
              src={IMAGES.logo}
              alt="BCS logo"
              width={48}
              height={48}
              priority
              className="object-cover"
            />
          </div>
          <span className="hidden sm:block font-serif text-lg text-gray-900 tracking-tight">
            Benin Chorale & Philharmonic
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm text-gray-700 hover:text-bcs-accent font-medium transition-colors"
            >
              {item.name}
            </Link>
          ))}
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/contact")}
            className="bg-bcs-green text-white hover:bg-bcs-accent"
          >
            Book Us
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          ref={menuButtonRef}
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          className="text-gray-800 md:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-bcs-green"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      <div
        id="mobile-menu"
        className={clsx(
          "absolute top-full inset-x-4 mt-3 p-5 rounded-2xl bg-white/95 shadow-lg backdrop-blur-md transition-all duration-300 md:hidden",
          isMenuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <nav className="flex flex-col gap-3">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2 rounded-md text-gray-700 hover:bg-bcs-green/10 transition-colors"
            >
              {item.name}
            </Link>
          ))}
          <Button
            variant="primary"
            className="w-full mt-3"
            onClick={() => (window.location.href = "/contact")}
          >
            Book Us
          </Button>
        </nav>
      </div>
    </header>
  );
};
