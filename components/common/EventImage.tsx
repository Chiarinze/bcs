"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
  blurData?: string | null;
}

export default function EventImage({ src, alt, className, blurData }: Props) {
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const finalSrc = !src || error ? "/default-event.jpg" : src;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "200px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative w-full h-full ${className || ""}`}>
      {isVisible && (
        <Image
          src={finalSrc}
          alt={alt}
          fill
          className="object-cover rounded-md transition-opacity duration-300"
          onError={() => setError(true)}
          placeholder={blurData ? "blur" : "empty"}
          blurDataURL={blurData || "/default-event.jpg"}
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      )}
      {!isVisible && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-md" />
      )}
    </div>
  );
}
