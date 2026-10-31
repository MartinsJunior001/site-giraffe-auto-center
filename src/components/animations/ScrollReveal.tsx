"use client";

import { useEffect, useRef } from "react";

export function ScrollReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.classList.add("is-pending");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { element.classList.add("is-visible"); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => { observer.disconnect(); element.classList.remove("is-pending"); };
  }, []);
  return <div ref={ref} className={`scroll-reveal ${className}`}>{children}</div>;
}
