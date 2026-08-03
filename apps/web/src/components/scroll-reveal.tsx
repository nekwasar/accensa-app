"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function ScrollReveal({ children, className = "", as: Component = "div" }: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(entry.target); 
        }
      },
      {
        threshold: 0,
        rootMargin: "0px",
      }
    );

    const timeoutId = setTimeout(() => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return (
    <Component 
      ref={ref as any} 
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
        isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"
      } ${className}`}
    >
      {children}
    </Component>
  );
}
