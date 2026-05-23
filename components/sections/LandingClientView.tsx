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
    const now = new Date();
    const localDaySerial =
      now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const dayIndex = (localDaySerial % 6) + 1;
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
    if (sec < 60) return '< 1MIN AGO';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}MIN AGO`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) {
      return hrs === 1 ? '1HR AGO' : `${hrs}HRS AGO`;
    }
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

      gsap.from('[data-hero-image]', { scale: 1.12, duration: 3.6, ease: 'power3.out' });
      gsap.fromTo('[data-hero-image]', { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' });

      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.3 });

      heroTl
        .from(dynamicEls[0] || '[data-dynamic-sentence]', {
          yPercent: 110,
          duration: 1.3,
          ease: 'power4.out',
          immediateRender: true,
        })
        .from('[data-line-draw]', {
          scaleX: 0,
          transformOrigin: 'left center',
          stagger: 0.1,
          duration: 1.0,
          ease: 'power3.inOut',
          immediateRender: true,
        }, '-=0.95')
        .from(dynamicDescs[0] || '[data-dynamic-desc]', {
          opacity: 0,
          y: 20,
          duration: 0.8,
          immediateRender: true,
        }, '-=0.75')
        .from('[data-hero-cta]', {
          opacity: 0,
          y: 16,
          scale: 0.95,
          stagger: 0.1,
          duration: 0.7,
          ease: 'back.out(1.4)',
          immediateRender: true,
        }, '-=0.6')
        .from('[data-hero-telemetry-row]', {
          opacity: 0,
          x: 20,
          stagger: 0.08,
          duration: 0.7,
          ease: 'power3.out',
          immediateRender: true,
        }, '-=0.6')
        .from('[data-scroll-cue]', {
          opacity: 0,
          y: 10,
          duration: 0.6,
          ease: 'power2.out',
          immediateRender: true,
        }, '-=0.3');

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

      gsap.to('[data-hero-badge]', {
        y: -6, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.2,
      });

      gsap.to('[data-line-draw]:first-of-type', {
        opacity: 0.6,
        duration: 2.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2,
      });

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

      gsap.to('[data-hero-image]', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: '[data-hero-section]', start: 'top top', end: 'bottom top', scrub: 1 },
      });

      gsap.to('[data-hero-content]', {
        yPercent: -8,
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: { trigger: '[data-hero-section]', start: 'top top', end: 'bottom top', scrub: 1 },
      });

      gsap.to('[data-hero-grid]', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: '[data-hero-section]', start: '40% top', end: 'bottom top', scrub: 1 },
      });

      /* ═══════════════════════════════════════════════════════════════
         4. CAROUSEL
      ═══════════════════════════════════════════════════════════════ */
      // Unpin precisely when the Capabilities section hits the top of the viewport
      ScrollTrigger.create({
        trigger: '[data-carousel-section]',
        start: 'top top',
        end: () => `+=${window.innerHeight}`,
        pin: true,
        pinSpacing: false,
      });

      gsap.to('[data-carousel-section]', {
        opacity: 0.3,
        scale: 0.97,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-features-section]',
          start: 'top 80%',
          end: 'top top',
          scrub: 1,
        },
      });

      /* ═══════════════════════════════════════════════════════════════
         5. CAPABILITIES — Section Pin & Entrance
      ═══════════════════════════════════════════════════════════════ */

      // 1. PIN THE SECTION + SCRUB CARDS
      // The whole section pins for a fixed scroll runway (`end: '+=200%'` =
      // 2 viewports of pinned scroll). Inside that runway, a scrubbed
      // timeline lifts each card from below the viewport up to its locked
      // stack position. Card 0 starts peeking from the bottom; cards 1-4
      // sit just out of sight below and rise in sequence as scroll
      // progresses. When the runway is consumed, the section unpins and
      // the next section enters normally.
      const cardEls = gsap.utils.toArray<HTMLElement>('[data-capability-card]');

      if (cardEls.length > 0) {
        // Initial positions: card 0 peeks at ~90vh, the rest sit at ~125vh
        // (off-screen below). xPercent: -50 centres them horizontally —
        // doing it via GSAP avoids fighting a tailwind transform class.
        cardEls.forEach((card, i) => {
          gsap.set(card, {
            xPercent: -50,
            y: i === 0 ? '35vh' : '70vh',
            scale: 1,
          });
        });

        // Final stack scales: back-of-stack cards are slightly smaller, so
        // the visible top edges form a subtle depth gradient.
        const finalScales = [0.85, 0.88, 0.91, 0.94, 0.97];

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '[data-features-section]',
            start: 'top top',
            end: '+=200%',
            pin: true,
            pinSpacing: true,
            scrub: 1,
          },
        });

        cardEls.forEach((card, i) => {
          tl.to(
            card,
            {
              y: 0,
              scale: finalScales[i] ?? 1,
              ease: 'power2.out',
              duration: 0.8,
            },
            i * 0.25,
          );
        });
      }

      // Subtle fade up on the title elements as the section enters the screen
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
         7. LIFTOFF SECTION
      ═══════════════════════════════════════════════════════════════ */

      gsap.fromTo('[data-earth-image]',
        { scale: 1.3, yPercent: 8 },
        {
          scale: 1,
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: '[data-earth-section]', start: 'top bottom', end: 'bottom top', scrub: 1.5 },
        }
      );

      gsap.fromTo('[data-earth-vignette]',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-earth-section]', start: 'top 80%' },
        }
      );

      gsap.from('[data-earth-rule]', {
        scaleX: 0,
        transformOrigin: 'center center',
        duration: 1.2,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 70%' },
      });

      gsap.from('[data-earth-icon]', {
        opacity: 0,
        scale: 0.4,
        y: -30,
        rotate: -90,
        duration: 1.1,
        ease: 'back.out(1.8)',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 68%' },
      });

      gsap.to('[data-earth-icon]', {
        rotate: 360,
        duration: 20,
        ease: 'none',
        repeat: -1,
        delay: 1.5,
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 68%' },
      });

      gsap.from('[data-earth-headline] [data-hero-char]', {
        opacity: 0,
        y: 60,
        rotate: 6,
        stagger: { each: 0.018, from: 'start' },
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 65%' },
      });

      gsap.from('[data-earth-headline-rule]', {
        scaleX: 0,
        transformOrigin: 'center center',
        duration: 0.8,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 62%' },
      });

      gsap.from('[data-earth-copy]', {
        opacity: 0,
        y: 32,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 60%' },
      });

      gsap.from('[data-earth-stat]', {
        opacity: 0,
        y: 24,
        scale: 0.9,
        stagger: 0.1,
        duration: 0.7,
        ease: 'back.out(1.4)',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 58%' },
      });

      gsap.from('[data-earth-cta]', {
        opacity: 0,
        y: 30,
        scale: 0.88,
        duration: 0.8,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top 55%' },
      });

      gsap.to('[data-earth-image]', {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: '[data-earth-section]', start: 'top bottom', end: 'bottom top', scrub: 2 },
      });

      gsap.to('[data-earth-icon]', {
        scale: 1.08,
        duration: 3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2,
      });

      return () => {
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

        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#050505_0%,rgba(5,5,5,0.2)_35%,rgba(5,5,5,0.2)_60%,#050505_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(5,5,5,0.7)_0%,transparent_45%,rgba(5,5,5,0.4)_100%)]" />

        <div data-hero-grid className="absolute inset-0 hero-grid opacity-50 pointer-events-none will-change-opacity" />
        <div className="absolute inset-0 hero-grain pointer-events-none" />

        <div
          data-hero-content
          className="relative z-10 min-h-[calc(100vh-64px)] flex items-center px-4 md:px-8"
        >
          <div className="w-full max-w-[1700px] mx-auto grid grid-cols-12 gap-x-6 lg:gap-x-12">
            <div className="col-span-12 lg:col-span-8 xl:col-span-8">
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

              <div
                data-line-draw
                className="h-px w-28 bg-[#FF5500] origin-left mb-6 md:mb-8 shadow-[0_0_12px_rgba(255,85,0,0.65)]"
              />

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
                  const parts: string[] = [];
                  parts.push('LL2');
                  if (launch?.launch_service_provider?.name) parts.push(launch.launch_service_provider.name.toUpperCase());
                  const src = parts.join(' / ');
                  return src ? <TelemetryRow label="Sources" value={src} scrambleDelay={2000} /> : null;
                })()}
                {(() => {
                  const date = launch?.updatedAt || launch?.updated_at || launch?.last_updated;
                  const s = timeAgoString(date);
                  return s ? <TelemetryRow label="Last sync" value={s} scrambleDelay={1900} /> : null;
                })()}
              </div>

              <div className="flex items-center gap-3 mt-1 font-mono text-[8px] uppercase tracking-[0.4em] text-zinc-700">
                <span>End of feed</span>
                <div data-line-draw className="h-px flex-1 bg-white/5 origin-left" />
              </div>
            </aside>
          </div>
        </div>

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
        className="relative h-screen overflow-hidden z-10 w-full bg-black border-t border-black"
      >
        {/* Background image + gradient — fills the pinned section (z-0). */}
        <img
          src={bgImage}
          alt=""
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/cap1.webp';
          }}
          className="absolute inset-0 w-full h-[130%] object-cover opacity-25 mix-blend-screen pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/60 to-black/95 pointer-events-none" />

        {/* Text block — z-30, sits at the top of the section.
            GSAP fades it in on entry; it stays put during the pinned scroll. */}
        <div className="relative z-30 w-full text-center pt-24 md:pt-32 px-6 pointer-events-none">
          <div
            data-capabilities-tag
            className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-[0.5em] mb-3 will-change-transform"
          >
            [Capabilities]
          </div>
          <h2
            data-capabilities-headline
            className="text-3xl md:text-5xl font-black uppercase tracking-normal mb-4 text-white will-change-transform"
          >
            Mission Capabilities
          </h2>
          <p
            data-capabilities-sub
            className="font-mono text-sm text-zinc-500 uppercase tracking-widest will-change-transform max-w-xl mx-auto"
          >
            Comprehensive telemetry for orbital operations
          </p>
        </div>

        {/* Cards — absolute, animated by the scrub timeline in the useGSAP
            block. Each card's CSS `top` is its FINAL stacked position; GSAP
            sets the initial y-offset so card 0 peeks from the bottom while
            cards 1-4 sit just out of sight below the viewport. */}
        {[
          {
            accent: '#FF6B35',
            number: '01',
            title: 'Global Manifest',
            copy: 'Track upcoming orbital launches from all agencies and providers worldwide with real-time countdowns and detailed mission intel.',
            href: '/launches',
          },
          {
            accent: '#18BBF7',
            number: '02',
            title: 'Starship Hub',
            copy: "Dedicated telemetry for SpaceX's Starship program. Monitor vehicle statuses, historical test flights, and program milestones.",
            href: '/starship',
          },
          {
            accent: '#FF6B35',
            number: '03',
            title: 'Orbital News',
            copy: 'Curated feed of the latest spaceflight news and dispatches from trusted aerospace publications.',
            href: '/articles',
          },
          {
            accent: '#18BBF7',
            number: '04',
            title: 'Satellite Tracker',
            copy: 'Live XYZ positions of satellites tracked by NASA SSC — ISS, MMS formation, Cluster, and more, rendered in a wireframe orbital grid.',
            href: '/tracker',
          },
          {
            accent: '#FF6B35',
            number: '05',
            title: 'APOD Archive',
            copy: "Daily astronomical observations and cosmic imagery, provided directly by NASA's Astronomy Picture of the Day API.",
            href: '/apod',
          },
        ].map((feat, i) => (
          <div
            key={i}
            data-capability-card={i}
            className="absolute left-1/2 w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-4xl h-80 bg-[#0a0a0a] border border-white/10 overflow-hidden shadow-2xl"
            style={{
              top: `calc(55vh + ${i * 12}px)`,
              zIndex: 20 + i,
              transformOrigin: 'top center',
              willChange: 'transform',
            }}
          >
            <div className="group relative w-full h-full flex flex-col">
              {/* TOP — Number + Title (left) and Access Module CTA (right) */}
              <div className="px-8 md:px-12 pt-6 md:pt-7 pb-5 flex items-center justify-between gap-4 md:gap-6 bg-black/40 border-b border-white/10">
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                  <div
                    className="font-mono text-[12px] uppercase tracking-[0.5em] font-bold whitespace-nowrap"
                    style={{ color: feat.accent }}
                  >
                    [{feat.number}]
                  </div>
                  <h3
                    className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-[1.1] text-white group-hover:text-[color:var(--accent)] transition-colors duration-300 truncate"
                    style={{ '--accent': feat.accent } as React.CSSProperties}
                  >
                    {feat.title}
                  </h3>
                </div>
                <Link
                  href={feat.href}
                  className="inline-flex items-center gap-2 font-mono text-[11px] md:text-[12px] uppercase tracking-widest font-black transition-all duration-300 group-hover:gap-4 whitespace-nowrap shrink-0"
                  style={{ color: feat.accent }}
                >
                  Access Module
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* BODY — Description, anchored to the top of the body area */}
              <div className="flex-1 px-8 md:px-12 pt-5 md:pt-6 pb-6 md:pb-8">
                <p className="text-sm md:text-base text-zinc-400 group-hover:text-zinc-200 leading-relaxed transition-colors duration-300">
                  {feat.copy}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ============================================================ */}
      {/* LIFTOFF — atmospheric closing section                         */}
      {/* ============================================================ */}
      <section
        data-earth-section
        className="relative py-32 px-6 overflow-hidden border-t border-white/10 bg-black flex items-center justify-center min-h-[80vh]"
      >
        <img
          data-earth-image
          src="/feature-earth.png"
          alt="Earth from Orbit"
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity will-change-transform"
        />

        <div data-earth-vignette className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20 will-change-opacity" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]" />

        <div
          data-earth-rule
          className="absolute top-1/2 -translate-y-32 left-0 right-0 mx-auto w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent origin-center will-change-transform"
        />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2
            data-earth-headline
            className="text-3xl md:text-5xl font-black uppercase tracking-normal mb-4"
          >
            <SplitChars text="Prepare for Liftoff" />
          </h2>

          <div
            data-earth-headline-rule
            className="h-px w-32 bg-[#18BBF7]/50 mx-auto mb-8 origin-center will-change-transform"
          />

          <p
            data-earth-copy
            className="text-lg text-zinc-300 font-light mb-8 max-w-2xl mx-auto will-change-transform"
          >
            Stay ahead of the curve with our comprehensive launch tracking terminal —
            engineered for aerospace enthusiasts around the world.
          </p>

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