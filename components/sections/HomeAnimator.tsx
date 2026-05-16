'use client';

import { useEffect } from 'react';
import gsap from 'gsap';

// Entrance animation for the homepage 3-block grid. Stagger-fades each block
// in from below, then reveals the inner content elements with a quick second
// pass for layered depth.
export default function HomeAnimator() {
  useEffect(() => {
    const blocks = gsap.utils.toArray<HTMLElement>('[data-home-block]');
    if (blocks.length === 0) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(
      blocks,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }
    );

    const inner = gsap.utils.toArray<HTMLElement>('[data-home-reveal]');
    if (inner.length > 0) {
      tl.fromTo(
        inner,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.04 },
        '-=0.45'
      );
    }

    return () => {
      tl.kill();
    };
  }, []);

  return null;
}
