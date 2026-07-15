'use client';

import { useEffect, useRef, useState } from 'react';

export default function OptimizedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '1200px' } // Keep image loaded within 1200px of viewport
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full h-full bg-zinc-900/30 overflow-hidden">
      {isVisible && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full h-full object-cover ${className || ''}`}
        />
      )}
    </div>
  );
}
