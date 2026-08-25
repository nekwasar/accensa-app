/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function ScrollReveal({
  children,
  className = '',
  as: Component = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    // Tells the failsafe timer in layout.tsx that the bundle made it. Until this
    // is set, the timer assumes hydration failed and unhides everything.
    document.documentElement.dataset.srReady = '1';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0,
        rootMargin: '0px',
      },
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
    // The hidden state lives in globals.css under `.js .scroll-reveal` rather
    // than in Tailwind classes here, so that the server-rendered HTML is only
    // hidden once the inline script has confirmed scripting works. Rendering
    // `opacity-0` directly would leave the page blank whenever JS never runs.
    <Component
      ref={ref as any}
      className={`scroll-reveal ${isRevealed ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}
