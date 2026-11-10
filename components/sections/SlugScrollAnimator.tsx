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

    // Global ScrollTrigger listeners and observers aren't reverted by ctx.revert().
    let removeStoryListeners: (() => void) | null = null;

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

      // ----- Launch story -------------------------------------------
      // The spine fills as the reader moves through the chapters, each
      // chapter's marker lights the moment the fill reaches it, and data bars
      // grow in from zero. Reduced-motion users get the finished state.
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const story = document.querySelector<HTMLElement>('[data-story]');
      const spineFill = document.querySelector<HTMLElement>('[data-story-progress]');

      if (story && spineFill && !reduceMotion) {
        // Marker positions come from offsetTop (which ignores the sections'
        // 40px fade-up offset) and are compared against the fill's own
        // scrub-smoothed progress, so the light and the line always agree.
        const track = spineFill.parentElement!;
        const nodes = gsap.utils.toArray<HTMLElement>('[data-story-node]');
        let nodeYs: number[] = [];
        const measure = () => {
          nodeYs = nodes.map((node) => {
            const section = node.offsetParent as HTMLElement;
            return section.offsetTop + node.offsetTop + node.offsetHeight / 2 - track.offsetTop;
          });
        };
        const light = (progress: number) => {
          const edge = progress * track.offsetHeight;
          nodes.forEach((node, i) => {
            const on = String(edge >= nodeYs[i]);
            if (node.dataset.on !== on) node.dataset.on = on;
          });
        };

        measure();
        light(0);
        ScrollTrigger.addEventListener('refreshInit', measure);

        // Late content (broadcast cards, fonts) pushes chapters down:
        // re-measure and re-map the fill whenever the story resizes.
        let frame = 0;
        const observer = new ResizeObserver(() => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => ScrollTrigger.refresh());
        });
        observer.observe(story);
        removeStoryListeners = () => {
          ScrollTrigger.removeEventListener('refreshInit', measure);
          observer.disconnect();
          cancelAnimationFrame(frame);
        };

        gsap.fromTo(
          spineFill,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: { trigger: story, start: 'top 60%', end: 'bottom 60%', scrub: 0.4 },
            onUpdate() {
              light(this.progress());
            },
          }
        );
      }

      if (!reduceMotion) {
        gsap.utils.toArray<HTMLElement>('[data-bar]').forEach((bar) => {
          gsap.from(bar, {
            scaleX: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: bar, start: 'top 90%', once: true },
          });
        });
      }
    });

    return () => {
      removeStoryListeners?.();
      ctx.revert();
    };
  }, []);

  return null;
}
