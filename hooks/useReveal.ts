import { useEffect } from "react";

/**
 * useReveal - adds a "revealed" class when an element enters the viewport.
 *
 * Usage:
 * 1. Add `data-reveal` to any element you want to animate.
 * 2. The CSS in globals.css handles the fade and slide effect.
 */
export default function useReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
