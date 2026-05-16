'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

// Scroll-triggered reveals for the launch detail page. Each section that
// wants to fade up on scroll opts in by tagging itself with
// `data-scroll-section`. Containers whose children should stagger in (e.g.
// crew avatars, stat columns) tag the wrapper with `data-scroll-stagger`.
//
// Doing it once at the page level — rather than inside every component —
// keeps the components themselves dumb and avoids registering one
// ScrollTrigger plugin per file.
export default function SlugScrollAnimator() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // ----- HERO on-mount timeline ---------------------------------
      // The hero is already in the viewport on first paint, so we drive a
      // bespoke timeline rather than waiting for a scroll trigger. Each
      // hero piece is staggered for that cinematic intro feel.
      const heroBg = document.querySelector<HTMLElement>('[data-hero-bg]');
      const heroOverlays = document.querySelectorAll<HTMLElement>('[data-hero-overlay]');
      const heroTitle = document.querySelector<HTMLElement>('[data-hero-title]');
      const heroBar = document.querySelector<HTMLElement>('[data-hero-bar]');
      const heroClock = document.querySelector<HTMLElement>('[data-hero-clock]');
      const heroMarquee = document.querySelector<HTMLElement>('[data-hero-marquee]');
      const heroPatch = document.querySelector<HTMLElement>('[data-hero-patch]');

      if (heroBg || heroTitle || heroBar || heroClock || heroMarquee) {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        if (heroBg) {
          gsap.set(heroBg, { opacity: 0, scale: 1.08 });
          tl.to(heroBg, { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out' }, 0);
        }

        if (heroOverlays.length > 0) {
          gsap.set(heroOverlays, { opacity: 0 });
          tl.to(heroOverlays, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.15);
        }

        if (heroTitle) {
          gsap.set(heroTitle, { opacity: 0, y: 40, letterSpacing: '0.05em' });
          tl.to(
            heroTitle,
            { opacity: 1, y: 0, letterSpacing: 'normal', duration: 0.9 },
            0.35
          );
        }

        if (heroBar) {
          gsap.set(heroBar, { scaleX: 0, transformOrigin: 'left center' });
          tl.to(heroBar, { scaleX: 1, duration: 0.6, ease: 'power3.inOut' }, 0.7);
        }

        if (heroClock) {
          gsap.set(heroClock, { opacity: 0, y: 24 });
          tl.to(heroClock, { opacity: 1, y: 0, duration: 0.7 }, 0.8);
        }

        if (heroMarquee) {
          gsap.set(heroMarquee, { opacity: 0, x: 30 });
          tl.to(heroMarquee, { opacity: 1, x: 0, duration: 0.7 }, 1.0);
        }

        if (heroPatch) {
          // patch is opacity-controlled by hover; bring its container
          // in alongside so it's ready when the user mouses over.
          gsap.set(heroPatch, { y: -12 });
          tl.to(heroPatch, { y: 0, duration: 0.6, ease: 'power2.out' }, 0.6);
        }
      }

      // ----- Scroll-triggered sections ------------------------------
      const sections = gsap.utils.toArray<HTMLElement>('[data-scroll-section]');
      if (sections.length > 0) {
        gsap.set(sections, { opacity: 0, y: 40 });
        ScrollTrigger.batch('[data-scroll-section]', {
          start: 'top 88%',
          onEnter: (els) => {
            gsap.to(els, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              stagger: 0.08,
              ease: 'power2.out',
              overwrite: true,
            });
          },
        });
      }

      const staggers = Array.from(
        document.querySelectorAll<HTMLElement>('[data-scroll-stagger]')
      );
      staggers.forEach((container) => {
        const children = Array.from(container.children) as HTMLElement[];
        if (children.length === 0) return;
        gsap.set(children, { opacity: 0, y: 20 });
        ScrollTrigger.create({
          trigger: container,
          start: 'top 85%',
          once: false,
          onEnter: () => {
            gsap.to(children, {
              opacity: 1,
              y: 0,
              duration: 0.55,
              stagger: 0.07,
              ease: 'power2.out',
              overwrite: true,
            });
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
