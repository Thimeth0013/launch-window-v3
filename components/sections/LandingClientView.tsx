'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Link from 'next/link';
import {
  ChevronRight,
  Globe
} from 'lucide-react';
import LandingCarousel, { buildCarouselSlides } from './LandingCarousel';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface LandingClientViewProps {
  apod: any;
  launch: any;
  article: any;
}

/* ------------------------------------------------------------------ */
/* Helpers — char-split for the hero title reveal                      */
/* ------------------------------------------------------------------ */

function SplitChars({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((word, wordIndex) => (
        <React.Fragment key={wordIndex}>
          <span className={`inline-block whitespace-nowrap ${wordIndex < words.length - 1 ? 'mr-[0.25em]' : ''}`}>
            {Array.from(word).map((char, charIndex) => (
              <span
                key={charIndex}
                data-hero-char
                className="inline-block will-change-transform"
                aria-hidden
              >
                {char}
              </span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

function ScrambledText({
  text,
  duration = 1000,
  delay = 0,
}: {
  text: string;
  duration?: number;
  delay?: number;
}) {
  const [output, setOutput] = useState(() =>
    text.split('').map((c) => (/[a-zA-Z0-9]/.test(c) ? '_' : c)).join('')
  );

  useEffect(() => {
    const pool = '!<>-_\\/[]{}—=+*^?#0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let raf = 0;
    const startAt = performance.now() + delay;

    const tick = (now: number) => {
      if (now < startAt) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - startAt;
      const progress = Math.min(elapsed / duration, 1);

      const out = Array.from(text)
        .map((char, i) => {
          if (!/[a-zA-Z0-9]/.test(char)) return char;
          const revealAt = (i / Math.max(text.length, 1)) * 0.6;
          if (progress >= revealAt + 0.4) return char;
          return pool[Math.floor(Math.random() * pool.length)];
        })
        .join('');

      setOutput(out);

      if (progress < 1) raf = requestAnimationFrame(tick);
      else setOutput(text);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, delay]);

  return <span>{output}</span>;
}

function TelemetryRow({
  label,
  value,
  detail,
  accent,
  scrambleDelay = 0,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: 'emerald' | 'cyan';
  scrambleDelay?: number;
}) {
  const valueClass =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'cyan'
        ? 'text-[#00E5FF]'
        : 'text-white';
  return (
    <div data-hero-telemetry-row className="will-change-transform">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[9px] text-zinc-500 uppercase tracking-[0.4em] font-mono">
          {label}
        </span>
        <span className={`text-[11px] font-black uppercase tracking-widest tabular-nums font-mono ${valueClass}`}>
          <ScrambledText text={value} delay={scrambleDelay} duration={900} />
        </span>
      </div>
      {detail && (
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1 truncate font-mono">
          <ScrambledText text={detail} delay={scrambleDelay + 100} duration={700} />
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function LandingClientView({ apod, launch, article }: LandingClientViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgImage, setBgImage] = useState<string>('/cap1.webp');

  useEffect(() => {
    // 24-hour daily changing image from cap1.webp to cap7.webp
    // Math.floor(Date.now() / 86400000) counts full UTC days since epoch.
    const dayIndex = (Math.floor(Date.now() / 86400000) % 7) + 1;
    setBgImage(`/cap${dayIndex}.webp`);
  }, []);

  const dynamicSentences = [
    'Track Global Orbital Launches',
    'Latest Spaceflight News Feed',
    'Starship Development Feed',
    'NASA Daily Cosmic Archive',
    'Live Mission Telemetry',
  ];

  const dynamicDescriptions = [
    <>
      A mission-control terminal for global spaceflight. Track launches worldwide, monitor countdowns, and read orbital intel — sourced live from{' '}
      <span className="text-white font-mono text-sm tracking-widest">LAUNCH LIBRARY 2</span>.
    </>,
    <>
      Stay informed with a curated feed of the latest spaceflight news and dispatches from trusted aerospace publications via the{' '}
      <span className="text-white font-mono text-sm tracking-widest">SPACE FLIGHT NEWS API</span>.
    </>,
    <>
      Dedicated telemetry for SpaceX's Starship program. Monitor vehicle statuses, historical test flights, and program milestones direct from Boca Chica — powered by{' '}
      <span className="text-white font-mono text-sm tracking-widest">LAUNCH LIBRARY 2</span>.
    </>,
    <>
      Explore the cosmos with daily astronomical observations and cosmic imagery, provided directly by{' '}
      <span className="text-white font-mono text-sm tracking-widest">NASA's</span> APOD API.
    </>,
    <>
      Comprehensive mission telemetry and live data feeds for ongoing orbital operations, webcasts via{' '}
      <span className="text-white font-mono text-sm tracking-widest">YOUTUBE</span>, and mission control streams across the globe.
    </>,
  ];

  function timeAgoString(d?: string | number | Date | null) {
    if (!d) return null;
    const then = new Date(d).getTime();
    if (isNaN(then)) return null;
    const diff = Date.now() - then;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return '< 1M AGO';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}M AGO`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}H AGO`;
    const days = Math.floor(hrs / 24);
    return `${days}D AGO`;
  }

  useGSAP(
    (_ctx, contextSafe) => {
      if (!contextSafe) return;

      const dynamicEls = gsap.utils.toArray<HTMLElement>('[data-dynamic-sentence]');
      const dynamicImgs = gsap.utils.toArray<HTMLElement>('[data-dynamic-image]');
      const dynamicDescs = gsap.utils.toArray<HTMLElement>('[data-dynamic-desc]');

      /* ═══════════════════════════════════════════════════════════════
         1. HERO — entrance timeline
      ═══════════════════════════════════════════════════════════════ */

      // Background: slow breathe-zoom + cinematic fade-in
      gsap.from('[data-hero-image]', { scale: 1.12, duration: 3.6, ease: 'power3.out' });
      gsap.fromTo('[data-hero-image]', { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' });

      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.3 });

      heroTl
        // Title line-mask reveal
        .from(dynamicEls[0] || '[data-dynamic-sentence]', {
          yPercent: 110,
          duration: 1.3,
          ease: 'power4.out',
          immediateRender: true,
        })
        // Orange divider + HUD rules draw left-to-right
        .from('[data-line-draw]', {
          scaleX: 0,
          transformOrigin: 'left center',
          stagger: 0.1,
          duration: 1.0,
          ease: 'power3.inOut',
          immediateRender: true,
        }, '-=0.95')
        // Subtitle fade-up
        .from(dynamicDescs[0] || '[data-dynamic-desc]', {
          opacity: 0,
          y: 20,
          duration: 0.8,
          immediateRender: true,
        }, '-=0.75')
        // CTA buttons
        .from('[data-hero-cta]', {
          opacity: 0,
          y: 16,
          scale: 0.95,
          stagger: 0.1,
          duration: 0.7,
          ease: 'back.out(1.4)',
          immediateRender: true,
        }, '-=0.6')
        // Telemetry HUD rows slide in from right
        .from('[data-hero-telemetry-row]', {
          opacity: 0,
          x: 20,
          stagger: 0.08,
          duration: 0.7,
          ease: 'power3.out',
          immediateRender: true,
        }, '-=0.6')
        // Scroll-cue fades in last
        .from('[data-scroll-cue]', {
          opacity: 0,
          y: 10,
          duration: 0.6,
          ease: 'power2.out',
          immediateRender: true,
        }, '-=0.3');

      /* ── Dynamic hero sentence cycle ─────────────────────────── */
      let cycleTl: gsap.core.Timeline | null = null;

      if (dynamicEls.length && dynamicImgs.length && dynamicDescs.length) {
        gsap.set(dynamicEls.slice(1), { autoAlpha: 0, yPercent: 8 });
        gsap.set(dynamicImgs.slice(1), { autoAlpha: 0, scale: 1.08 });
        gsap.set(dynamicDescs.slice(1), { autoAlpha: 0, yPercent: 8 });
        gsap.set(dynamicEls[0], { autoAlpha: 1, yPercent: 0 });
        gsap.set(dynamicImgs[0], { autoAlpha: 0.55, scale: 1 });
        gsap.set(dynamicDescs[0], { autoAlpha: 1, yPercent: 0 });

        cycleTl = gsap.timeline({ repeat: -1, delay: 5.6 });

        dynamicEls.forEach((el, index) => {
          const img = dynamicImgs[index];
          const desc = dynamicDescs[index];
          const next = (index + 1) % dynamicEls.length;
          const nextEl = dynamicEls[next];
          const nextImg = dynamicImgs[next];
          const nextDesc = dynamicDescs[next];

          cycleTl!
            .to(el, { yPercent: -8, autoAlpha: 0, filter: 'blur(8px)', duration: 0.7, ease: 'power3.inOut' })
            .to(desc, { yPercent: -8, autoAlpha: 0, filter: 'blur(8px)', duration: 0.7, ease: 'power3.inOut' }, '<0.05')
            .to(img, { autoAlpha: 0, scale: 0.95, filter: 'blur(8px)', duration: 0.8, ease: 'power2.inOut' }, '<-0.05')
            .fromTo(nextEl, { yPercent: 8, autoAlpha: 0, filter: 'blur(8px)' }, { yPercent: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', immediateRender: false }, '<0.4')
            .fromTo(nextDesc, { yPercent: 8, autoAlpha: 0, filter: 'blur(8px)' }, { yPercent: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', immediateRender: false }, '<0.05')
            .fromTo(nextImg, { autoAlpha: 0, scale: 1.08, filter: 'blur(8px)' }, { autoAlpha: 0.55, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out', immediateRender: false }, '<-0.05')
            .to({}, { duration: 5.6 });
        });
      }

      /* ═══════════════════════════════════════════════════════════════
         2. HERO — continuous ambient animations
      ═══════════════════════════════════════════════════════════════ */

      // Badge float
      gsap.to('[data-hero-badge]', {
        y: -6, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.2,
      });

      // Subtle pulse on the orange divider glow
      gsap.to('[data-line-draw]:first-of-type', {
        opacity: 0.6,
        duration: 2.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2,
      });

      // Hero CTA button — subtle breathing scale so it draws the eye
      gsap.to('[data-hero-cta]', {
        scale: 1.018,
        duration: 2.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 3,
      });

      /* ═══════════════════════════════════════════════════════════════
         3. HERO — scroll-driven parallax
      ═══════════════════════════════════════════════════════════════ */

      // Background image drifts down as we scroll away
      gsap.to('[data-hero-image]', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: '[data-hero-section]', start: 'top top', end: 'bottom top', scrub: 1 },
      });

      // Hero content fades + lifts slightly on scroll
      gsap.to('[data-hero-content]', {
        yPercent: -8,
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: { trigger: '[data-hero-section]', start: 'top top', end: 'bottom top', scrub: 1 },
      });

      // Tactical grid fades out as user scrolls (feels like leaving the HUD)
      gsap.to('[data-hero-grid]', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: '[data-hero-section]', start: '40% top', end: 'bottom top', scrub: 1 },
      });

      /* ═══════════════════════════════════════════════════════════════
         4. CAROUSEL — pin + capabilities overlay
      ═══════════════════════════════════════════════════════════════ */

      // Pin carousel while capabilities rises over it
      ScrollTrigger.create({
        trigger: '[data-carousel-section]',
        start: 'top top',
        end: () => {
          const overlay = document.querySelector('[data-capabilities-overlay]') as HTMLElement | null;
          return overlay ? `+=${overlay.offsetHeight * 0.6}` : '+=600';
        },
        pin: true,
        pinSpacing: false,
      });

      // Capabilities panel rises from below — scrubbed to scroll with safe, smooth overlap
      gsap.from('[data-capabilities-overlay]', {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-capabilities-overlay]',
          start: 'top bottom',
          end: 'top top',
          scrub: 1,
        },
      });

      // Carousel itself fades + scales down as the capabilities panel covers it
      gsap.to('[data-carousel-section]', {
        opacity: 0.3,
        scale: 0.97,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-capabilities-overlay]',
          start: 'top 80%',
          end: 'top top',
          scrub: 1,
        },
      });

      /* ═══════════════════════════════════════════════════════════════
         5. CAPABILITIES — section entrance
      ═══════════════════════════════════════════════════════════════ */

      // Eyebrow tag + headline + subtext stagger up
      gsap.from('[data-capabilities-tag]', {
        opacity: 0,
        y: 20,
        letterSpacing: '0.1em',
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-features-section]', start: 'top 80%' },
      });

      gsap.from('[data-capabilities-headline]', {
        opacity: 0,
        y: 40,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-features-section]', start: 'top 78%' },
      });

      gsap.from('[data-capabilities-sub]', {
        opacity: 0,
        y: 20,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-features-section]', start: 'top 75%' },
      });

      // Feature cards stagger in with a cascade
      gsap.from('[data-feature-card]', {
        opacity: 0,
        y: 80,
        scale: 0.96,
        stagger: { each: 0.12, from: 'start' },
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-features-section]', start: 'top 70%' },
      });

      // Card accent numbers count up from 0 opacity
      gsap.from('[data-card-number]', {
        opacity: 0,
        scale: 0.5,
        stagger: { each: 0.12, from: 'start' },
        duration: 0.6,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '[data-features-section]', start: 'top 68%' },
      });

      // Card titles slide in from the left with a tiny delay after the card itself
      gsap.from('[data-card-title]', {
        opacity: 0,
        x: -16,
        stagger: { each: 0.12, from: 'start' },
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-features-section]', start: 'top 67%' },
      });

      // Grid bg slow drift (parallax) — balanced fromTo to ensure the h-[130%] image always covers the container
      gsap.fromTo('[data-grid-bg]',
        { yPercent: -15 },
        {
          yPercent: 15,
          ease: 'none',
          scrollTrigger: { trigger: '[data-features-section]', start: 'top bottom', end: 'bottom top', scrub: 1 },
        }
      );

      /* ── 3D tilt + border glow on hover ─────────────────────── */
      const cards = gsap.utils.toArray<HTMLElement>('[data-feature-card]');
      const cardCleanups: Array<() => void> = [];

      cards.forEach((card) => {
        const onMove = contextSafe((e: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotationY: px * 20,
            rotationX: -py * 20,
            transformPerspective: 900,
            transformOrigin: 'center center',
            duration: 0.45,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        });
        const onLeave = contextSafe(() => {
          gsap.to(card, {
            rotationY: 0,
            rotationX: 0,
            duration: 0.7,
            ease: 'elastic.out(1, 0.6)',
            overwrite: 'auto',
          });
        });
        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
        cardCleanups.push(() => {
          card.removeEventListener('mousemove', onMove);
          card.removeEventListener('mouseleave', onLeave);
        });
      });

      /* ═══════════════════════════════════════════════════════════════
         6. MAGNETIC CTAs
      ═══════════════════════════════════════════════════════════════ */

      const magnets = gsap.utils.toArray<HTMLElement>('[data-magnetic]');
      const magnetCleanups: Array<() => void> = [];

      magnets.forEach((mag) => {
        const onMove = contextSafe((e: MouseEvent) => {
          const rect = mag.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(mag, { x: x * 0.25, y: y * 0.45, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
        });
        const onLeave = contextSafe(() => {
          gsap.to(mag, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.55)', overwrite: 'auto' });
        });
        mag.addEventListener('mousemove', onMove);
        mag.addEventListener('mouseleave', onLeave);
        magnetCleanups.push(() => {
          mag.removeEventListener('mousemove', onMove);
          mag.removeEventListener('mouseleave', onLeave);
        });
      });

      /* ═══════════════════════════════════════════════════════════════
         7. LIFTOFF SECTION — cinematic reveal sequence
      ═══════════════════════════════════════════════════════════════ */

      // Earth image: scrubbed scale + parallax zoom — starts large, settles as section enters
      gsap.fromTo('[data-earth-image]',
        { scale: 1.3, yPercent: 8 },
        {
          scale: 1,
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: '[data-earth-section]', start: 'top bottom', end: 'bottom top', scrub: 1.5 },
        }
      );

      // Vignette overlay fades in as the section enters for dramatic effect
      gsap.fromTo('[data-earth-vignette]',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-earth-section]', start: 'top 80%' },
        }
      );

      // Horizontal rule above globe icon draws in from center
      gsap.from('[data-earth-rule]', {
        scaleX: 0,
        transformOrigin: 'center center',
        duration: 1.2,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 70%' },
      });

      // Globe icon: drop + bounce + slow continuous rotation
      gsap.from('[data-earth-icon]', {
        opacity: 0,
        scale: 0.4,
        y: -30,
        rotate: -90,
        duration: 1.1,
        ease: 'back.out(1.8)',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 68%' },
      });

      // Slow continuous rotation on the globe once it's in
      gsap.to('[data-earth-icon]', {
        rotate: 360,
        duration: 20,
        ease: 'none',
        repeat: -1,
        delay: 1.5,
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 68%' },
      });

      // Liftoff headline: each char fans in with rotation — dramatic
      gsap.from('[data-earth-headline] [data-hero-char]', {
        opacity: 0,
        y: 60,
        rotate: 6,
        stagger: { each: 0.018, from: 'start' },
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 65%' },
      });

      // Horizontal accent rule under headline draws outward from center
      gsap.from('[data-earth-headline-rule]', {
        scaleX: 0,
        transformOrigin: 'center center',
        duration: 0.8,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 62%' },
      });

      // Body copy fades up with a slight clip feel
      gsap.from('[data-earth-copy]', {
        opacity: 0,
        y: 32,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 60%' },
      });

      // Stat counter chips stagger in from below
      gsap.from('[data-earth-stat]', {
        opacity: 0,
        y: 24,
        scale: 0.9,
        stagger: 0.1,
        duration: 0.7,
        ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 58%' },
      });

      // CTA button springs in last
      gsap.from('[data-earth-cta]', {
        opacity: 0,
        y: 30,
        scale: 0.88,
        duration: 0.8,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 55%' },
      });

      // Earth image subtle parallax while in view
      gsap.to('[data-earth-image]', {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top bottom', end: 'bottom top', scrub: 2 },
      });

      // Continuous slow pulse on the globe icon — breathing glow via scale
      gsap.to('[data-earth-icon]', {
        scale: 1.08,
        duration: 3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2,
      });

      /* ── Cleanup ──────────────────────────────────────────────── */
      return () => {
        cardCleanups.forEach((fn) => fn());
        magnetCleanups.forEach((fn) => fn());
        if (cycleTl) cycleTl.kill();
      };
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-black overflow-x-hidden">

      {/* ============================================================ */}
      {/* HERO                                                          */}
      {/* ============================================================ */}
      <section
        data-hero-section
        className="relative min-h-screen w-full overflow-hidden bg-[#050505]"
      >
        {/* Cinematic background images */}
        <div data-hero-image className="absolute inset-0 w-full h-full will-change-transform bg-[#050505]">
          {[1, 2, 3, 4, 5].map((num, i) => (
            <img
              key={num}
              data-dynamic-image
              src={`/${num}.webp`}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover will-change-transform ${i === 0 ? 'opacity-55' : 'opacity-0'}`}
            />
          ))}
        </div>

        {/* Gradients */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#050505_0%,rgba(5,5,5,0.2)_35%,rgba(5,5,5,0.2)_60%,#050505_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(5,5,5,0.7)_0%,transparent_45%,rgba(5,5,5,0.4)_100%)]" />

        {/* Tactical grid + film grain */}
        <div data-hero-grid className="absolute inset-0 hero-grid opacity-50 pointer-events-none will-change-opacity" />
        <div className="absolute inset-0 hero-grain pointer-events-none" />

        {/* ── MAIN GRID ──────────────────────────────────────────── */}
        <div
          data-hero-content
          className="relative z-10 min-h-[calc(100vh-64px)] flex items-center px-4 md:px-8"
        >
          <div className="w-full max-w-[1700px] mx-auto grid grid-cols-12 gap-x-6 lg:gap-x-12">

            {/* ── LEFT COLUMN ─────────────────────────────────────── */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-8">

              {/* Dynamic title */}
              <h1 className="grid items-center font-display font-bold uppercase tracking-normal mb-2 overflow-hidden py-2 md:py-4">
                {dynamicSentences.map((s, i) => (
                  <span
                    key={i}
                    data-dynamic-sentence
                    className="col-start-1 row-start-1 w-full will-change-transform"
                  >
                    <span className="block text-4xl md:text-6xl lg:text-7xl xl:text-8xl text-white">
                      <SplitChars text={s} />
                    </span>
                  </span>
                ))}
              </h1>

              {/* Orange divider */}
              <div
                data-line-draw
                className="h-px w-28 bg-[#FF5500] origin-left mb-6 md:mb-8 shadow-[0_0_12px_rgba(255,85,0,0.65)]"
              />

              {/* Dynamic description */}
              <div className="grid items-start mb-4 md:mb-8 relative overflow-hidden py-1">
                {dynamicDescriptions.map((desc, i) => (
                  <p
                    key={i}
                    data-dynamic-desc
                    className="col-start-1 row-start-1 w-full text-base md:text-lg max-w-2xl text-[#9CA3AF] leading-relaxed will-change-transform"
                  >
                    {desc}
                  </p>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/launches"
                  data-hero-cta
                  data-magnetic
                  className="group inline-flex items-center gap-3 px-7 md:px-8 py-4 bg-white text-black font-mono text-sm uppercase tracking-[0.25em] font-black transition-colors hover:bg-[#FF5500] hover:text-white will-change-transform"
                >
                  Explore Launches
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* ── TELEMETRY HUD ────────────────────────────────────── */}
            <aside className="hidden lg:flex col-span-12 lg:col-span-4 xl:col-span-4 flex-col gap-5 self-end pb-2 border-l border-white/10 pl-6">

              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]">
                <span className="text-[#00E5FF] font-black">Telemetry</span>
                <div
                  data-line-draw
                  className="h-px flex-1 bg-[#00E5FF]/50 origin-left shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                />
              </div>

              <div className="space-y-3.5">
                {(launch?.name) && (
                  <TelemetryRow
                    label="Upcoming"
                    value={(launch.name || '').slice(0, 26).toUpperCase()}
                    scrambleDelay={1800}
                  />
                )}
                {(() => {
                  const date = launch?.updatedAt || launch?.updated_at || launch?.last_updated;
                  const s = timeAgoString(date);
                  return s ? <TelemetryRow label="Last sync" value={s} scrambleDelay={1900} /> : null;
                })()}
                {(() => {
                  const parts: string[] = [];
                  parts.push('LL2');
                  if (launch?.launch_service_provider?.name) parts.push(launch.launch_service_provider.name.toUpperCase());
                  if (article) parts.push('SPACE FLIGHT NEWS API');
                  const hasYoutube = !!(launch?.webcast_live || (launch?.vid_urls && launch.vid_urls.length > 0 && launch.vid_urls.some((v: any) => (v.url || '').includes('youtube'))));
                  if (hasYoutube) parts.push('YOUTUBE');
                  const src = parts.join(' / ');
                  return src ? <TelemetryRow label="Sources" value={src} scrambleDelay={2000} /> : null;
                })()}
              </div>

              <div className="flex items-center gap-3 mt-1 font-mono text-[8px] uppercase tracking-[0.4em] text-zinc-700">
                <span>End of feed</span>
                <div data-line-draw className="h-px flex-1 bg-white/5 origin-left" />
              </div>
            </aside>
          </div>
        </div>

        {/* Scroll cue */}
        <div
          data-scroll-cue
          onClick={() => window.scrollTo({ top: window.innerHeight - 64, behavior: 'smooth' })}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center group cursor-pointer will-change-transform"
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.4em] text-[#FF5500] opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none mb-3">
            Scroll Down
          </span>
          <div className="w-8 h-12 flex items-center justify-center">
            <div
              className="w-px h-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,85,0,0.6)_50%,transparent_100%)]"
              style={{ animation: 'hero-scroll-cue 2.4s ease-in-out infinite' }}
            />
          </div>
        </div>

        <style>{`
          @keyframes hero-scroll-cue {
            0%, 100% { transform: scaleY(0.3); transform-origin: top; opacity: 0.25; }
            50%       { transform: scaleY(1);   transform-origin: top; opacity: 1; }
          }
        `}</style>
      </section>

      {/* ============================================================ */}
      {/* FEATURED INTEL CAROUSEL                                       */}
      {/* Pinned by GSAP while capabilities panel rises over it        */}
      {/* ============================================================ */}
      <section
        data-carousel-section
        className="relative w-full border-t border-b border-white/10 bg-zinc-950 will-change-transform"
      >
        <LandingCarousel slides={buildCarouselSlides(apod, launch, article)} />
      </section>

      {/* ============================================================ */}
      {/* CAPABILITIES GRID                                             */}
      {/* ============================================================ */}
      <section
        data-features-section
        data-capabilities-overlay
        className="relative z-10 py-24 md:py-32 px-6 md:px-12 bg-black overflow-hidden"
      >
        {/* Parallax metallic bg */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-grid-bg
          src={bgImage}
          alt=""
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/cap1.webp';
          }}
          className="absolute inset-0 w-full h-[130%] object-cover opacity-25 pointer-events-none mix-blend-screen will-change-transform"
        />

        <div className="relative z-10 max-w-7xl mx-auto">

          {/* Eyebrow + headline */}
          <div className="text-center mb-16 md:mb-24">
            <div
              data-capabilities-tag
              className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-[0.5em] mb-3 will-change-transform"
            >
              [Capabilities]
            </div>
            <h2
              data-capabilities-headline
              className="text-3xl md:text-5xl font-black uppercase tracking-normal mb-4 will-change-transform"
            >
              Mission Capabilities
            </h2>
            <p
              data-capabilities-sub
              className="font-mono text-sm text-zinc-500 uppercase tracking-widest will-change-transform"
            >
              Comprehensive telemetry for orbital operations
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                accent: '#FF6B35',
                number: '01',
                title: 'Global Manifest',
                copy: 'Track upcoming orbital launches from all agencies and providers worldwide with real-time countdowns and detailed mission intel.',
              },
              {
                accent: '#18BBF7',
                number: '02',
                title: 'Starship Hub',
                copy: "Dedicated telemetry for SpaceX's Starship program. Monitor vehicle statuses, historical test flights, and program milestones.",
              },
              {
                accent: '#FF6B35',
                number: '03',
                title: 'Orbital News',
                copy: 'Curated feed of the latest spaceflight news and dispatches from trusted aerospace publications.',
              },
              {
                accent: '#18BBF7',
                number: '04',
                title: 'APOD Archive',
                copy: "Daily astronomical observations and cosmic imagery, provided directly by NASA's Astronomy Picture of the Day API.",
              },
            ].map((feat, i) => (
              <div
                key={i}
                data-feature-card
                className="group relative bg-[#0a0a0a]/40 backdrop-blur-xs border border-white/10 p-8 hover:border-white/30 transition-colors will-change-transform"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Number */}
                <div
                  data-card-number
                  className="font-mono text-[10px] uppercase tracking-[0.4em] mb-4 will-change-transform"
                  style={{ color: feat.accent }}
                >
                  {feat.number}
                </div>

                <h3 data-card-title className="text-xl font-bold uppercase tracking-tight mb-3 will-change-transform">
                  {feat.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feat.copy}</p>

                {/* Brutalist corner tick */}
                <div
                  className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ borderColor: feat.accent }}
                />

                {/* Bottom corner tick */}
                <div
                  className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{ borderColor: feat.accent }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* LIFTOFF — atmospheric closing section                         */}
      {/* ============================================================ */}
      <section
        data-earth-section
        className="relative py-32 px-6 overflow-hidden border-t border-white/10 bg-black flex items-center justify-center min-h-[80vh]"
      >
        {/* Earth image — parallax + scale scrub */}
        <img
          data-earth-image
          src="/feature-earth.png"
          alt="Earth from Orbit"
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity will-change-transform"
        />

        {/* Layered vignettes */}
        <div data-earth-vignette className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20 will-change-opacity" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]" />

        {/* Horizontal rule above content */}
        <div
          data-earth-rule
          className="absolute top-1/2 -translate-y-32 left-0 right-0 mx-auto w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent origin-center will-change-transform"
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center">

          {/* Headline */}
          <h2
            data-earth-headline
            className="text-3xl md:text-5xl font-black uppercase tracking-normal mb-4"
          >
            <SplitChars text="Prepare for Liftoff" />
          </h2>

          {/* Thin accent rule under headline */}
          <div
            data-earth-headline-rule
            className="h-px w-32 bg-[#18BBF7]/50 mx-auto mb-8 origin-center will-change-transform"
          />

          {/* Body copy */}
          <p
            data-earth-copy
            className="text-lg text-zinc-300 font-light mb-8 max-w-2xl mx-auto will-change-transform"
          >
            Stay ahead of the curve with our comprehensive launch tracking terminal —
            engineered for aerospace enthusiasts around the world.
          </p>

          {/* CTA */}
          <Link
            href="/launches"
            data-earth-cta
            data-magnetic
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-mono text-sm uppercase tracking-widest font-black transition-colors hover:bg-[#18BBF7] will-change-transform"
          >
            Access Terminal
          </Link>
        </div>
      </section>
    </div>
  );
}