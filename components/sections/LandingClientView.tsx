'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Link from 'next/link';
import {
  ChevronRight,
  Database,
  Globe,
  Rocket,
  ShieldAlert,
  Newspaper,
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

// Single row inside the hero "instrument panel" on the right. Mono labels,
// optional detail line underneath, optional emerald accent on the value.
// Inline scramble effect — cycles through random glyphs for ~1s on mount
// before locking into the final string. Non-alphanumeric chars (spaces,
// slashes, periods, etc.) are preserved through the scramble so the shape
// of the line is recognisable mid-cycle.
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
          // Anchor punctuation/whitespace so the shape stays readable
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
        <span
          className={`text-[11px] font-black uppercase tracking-widest tabular-nums font-mono ${valueClass}`}
        >
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

  // Helper: human-friendly relative time for "Last sync". Returns null if no date.
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

      /* ── 1. Hero entrance timeline ──────────────────────────────── */
      // Slow 3.5s background breathing zoom runs in parallel with the main
      // timeline — feels like the camera is settling.
      gsap.from('[data-hero-image]', {
        scale: 1.12,
        duration: 3.6,
        ease: 'power3.out',
      });

      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.15 });

      heroTl
        // Top HUD strip: items slide down from above
        .from('[data-hero-topbar]', {
          opacity: 0,
          y: -14,
          stagger: 0.07,
          duration: 0.6,
          ease: 'power3.out',
        })
        // Eyebrow ([01] // PRIMARY DIRECTIVE ...)
        .from(
          '[data-hero-eyebrow]',
          { opacity: 0, y: 18, duration: 0.55 },
          '-=0.2'
        )
        // TITLE — line-mask reveal: each line lives inside overflow-hidden,
        // the inner span starts shifted down by 110% of its height and
        // slides up to its natural position. Stagger per line.
        .from(
          '[data-title-line], [data-dynamic-sentence]',
          {
            yPercent: 110,
            stagger: 0.11,
            duration: 1.1,
            ease: 'power4.out',
          },
          '-=0.25'
        )
        // Line-draws: orange rule, HUD rules, terminator — all scale from 0
        // off their left edge to 100% width.
        .from(
          '[data-line-draw]',
          {
            scaleX: 0,
            transformOrigin: 'left center',
            stagger: 0.08,
            duration: 0.8,
            ease: 'power3.inOut',
          },
          '-=0.7'
        )
        // Subtitle fade-up
        .from(
          '[data-dynamic-desc]',
          { 
            opacity: 0, 
            y: 28, 
            duration: 0.65,
          },
          '-=0.55'
        )
        // CTAs
        .from(
          '[data-hero-cta]',
          {
            opacity: 0,
            y: 22,
            scale: 0.94,
            stagger: 0.08,
            duration: 0.5,
            ease: 'back.out(1.6)',
          },
          '-=0.4'
        )
        // Telemetry rows slide in from the right; the scramble effect on
        // their values starts internally a few hundred ms later (see the
        // `scrambleDelay` props on each TelemetryRow).
        .from(
          '[data-hero-telemetry-row]',
          {
            opacity: 0,
            x: 30,
            stagger: 0.07,
            duration: 0.5,
            ease: 'power3.out',
          },
          '-=0.55'
        );

      /* ── Dynamic hero sentences cycle ───────────────────────── */
      let cycleTl: gsap.core.Timeline | null = null;
      const dynamicEls = gsap.utils.toArray<HTMLElement>('[data-dynamic-sentence]');
      const dynamicImgs = gsap.utils.toArray<HTMLElement>('[data-dynamic-image]');
      const dynamicDescs = gsap.utils.toArray<HTMLElement>('[data-dynamic-desc]');

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
          const nextIndex = (index + 1) % dynamicEls.length;
          const nextEl = dynamicEls[nextIndex];
          const nextImg = dynamicImgs[nextIndex];
          const nextDesc = dynamicDescs[nextIndex];

          cycleTl!
            .to(el, { yPercent: -8, autoAlpha: 0, filter: 'blur(8px)', duration: 0.7, ease: 'power3.inOut' })
            .to(desc, { yPercent: -8, autoAlpha: 0, filter: 'blur(8px)', duration: 0.7, ease: 'power3.inOut' }, '<0.05')
            .to(img, { autoAlpha: 0, scale: 0.95, filter: 'blur(8px)', duration: 0.8, ease: 'power2.inOut' }, '<-0.05')
            .fromTo(nextEl, { yPercent: 8, autoAlpha: 0, filter: 'blur(8px)' }, { yPercent: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }, '<0.4')
            .fromTo(nextDesc, { yPercent: 8, autoAlpha: 0, filter: 'blur(8px)' }, { yPercent: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }, '<0.05')
            .fromTo(nextImg, { autoAlpha: 0, scale: 1.08, filter: 'blur(8px)' }, { autoAlpha: 0.55, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' }, '<-0.05')
            .to({}, { duration: 5.6 }); // Hold time
        });
      }

      /* ── 2. Continuous float on the live-telemetry badge ────────── */
      gsap.to('[data-hero-badge]', {
        y: -6,
        duration: 2.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 1.2, // start after entrance settles
      });

      /* ── 3. Parallax on the hero rocket image ───────────────────── */
      gsap.to('[data-hero-image]', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-hero-section]',
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });
      gsap.to('[data-hero-content]', {
        yPercent: -8,
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-hero-section]',
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      /* ── 4. Capabilities section reveal + 3D tilt on cards ──────── */
      gsap.from('[data-section-eyebrow]', {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-features-section]',
          start: 'top 80%',
        },
      });

      gsap.from('[data-feature-card]', {
        opacity: 0,
        y: 80,
        scale: 0.96,
        stagger: 0.1,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-features-section]',
          start: 'top 70%',
        },
      });

      // 3D tilt — uses contextSafe so handlers no-op after unmount and
      // listeners are cleaned up in the return below.
      const cards = gsap.utils.toArray<HTMLElement>('[data-feature-card]');
      const cardCleanups: Array<() => void> = [];

      cards.forEach((card) => {
        const onMove = contextSafe((e: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotationY: px * 10,
            rotationX: -py * 10,
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

      /* ── 5. Magnetic hover on primary CTA buttons ───────────────── */
      const magnets = gsap.utils.toArray<HTMLElement>('[data-magnetic]');
      const magnetCleanups: Array<() => void> = [];

      magnets.forEach((mag) => {
        const onMove = contextSafe((e: MouseEvent) => {
          const rect = mag.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(mag, {
            x: x * 0.25,
            y: y * 0.45,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        });
        const onLeave = contextSafe(() => {
          gsap.to(mag, {
            x: 0,
            y: 0,
            duration: 0.7,
            ease: 'elastic.out(1, 0.55)',
            overwrite: 'auto',
          });
        });
        mag.addEventListener('mousemove', onMove);
        mag.addEventListener('mouseleave', onLeave);
        magnetCleanups.push(() => {
          mag.removeEventListener('mousemove', onMove);
          mag.removeEventListener('mouseleave', onLeave);
        });
      });

      /* ── 6. "Prepare for Liftoff" — scroll-driven scale + parallax ─ */
      gsap.from('[data-earth-icon]', {
        opacity: 0,
        scale: 0.6,
        rotate: -45,
        duration: 1,
        ease: 'back.out(1.6)',
        scrollTrigger: {
          trigger: '[data-earth-section]',
          start: 'top 70%',
        },
      });

      gsap.from('[data-earth-headline] [data-hero-char]', {
        opacity: 0,
        y: 50,
        rotate: 4,
        stagger: { each: 0.015, from: 'start' },
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-earth-section]',
          start: 'top 70%',
        },
      });

      gsap.from('[data-earth-copy]', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-earth-section]',
          start: 'top 65%',
        },
      });

      gsap.from('[data-earth-cta]', {
        opacity: 0,
        y: 30,
        scale: 0.92,
        duration: 0.7,
        ease: 'back.out(1.6)',
        scrollTrigger: {
          trigger: '[data-earth-section]',
          start: 'top 60%',
        },
      });

      // Scrubbed background scale on the earth image — cinematic zoom-in
      gsap.fromTo(
        '[data-earth-image]',
        { scale: 1.25, yPercent: 6 },
        {
          scale: 1,
          yPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-earth-section]',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        }
      );

      /* ── 7. Grid background drift in capabilities section ───────── */
      gsap.to('[data-grid-bg]', {
        yPercent: 25,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-features-section]',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });

      /* ── Cleanup: detach event listeners (gsap.context cleans tweens) */
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

      <section
        data-hero-section
        className="relative min-h-screen w-full overflow-hidden bg-[#050505]"
      >
        {/* Cinematic background: dynamic images corresponding to text */}
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

        {/* Heavy gradient: dark top + dark bottom, mostly transparent middle */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#050505_0%,rgba(5,5,5,0.2)_35%,rgba(5,5,5,0.2)_60%,#050505_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(5,5,5,0.7)_0%,transparent_45%,rgba(5,5,5,0.4)_100%)]" />

        {/* Tactical grid backdrop + film grain — gives that monitor feel */}
        <div className="absolute inset-0 hero-grid opacity-50 pointer-events-none" />
        <div className="absolute inset-0 hero-grain pointer-events-none" />

        {/* Top HUD removed — use global `AppHeader` instead to avoid duplication */}

        {/* ── MAIN GRID ──────────────────────────────────────────── */}
        <div
          data-hero-content
          className="relative z-10 min-h-[calc(100vh-64px)] flex items-center px-4 md:px-8"
        >
          <div className="w-full max-w-[1700px] mx-auto grid grid-cols-12 gap-x-6 lg:gap-x-12">

            {/* ── ZONE B · MAIN LEFT COLUMN ───────────────────────── */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-8">

              {/* HERO TITLE — cycles through dynamic sentences */}
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

              {/* Sharp orange divider — drawn in on load */}
              <div
                data-line-draw
                className="h-px w-28 bg-[#FF5500] origin-left mb-6 md:mb-8 shadow-[0_0_12px_rgba(255,85,0,0.65)]"
              />

              {/* Dynamic Paragraphs */}
              <div className="grid items-start mb-10 md:mb-12 relative overflow-hidden py-1">
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

              {/* CTAs — sharp corners, zero radius */}
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

            {/* ── ZONE C · BOTTOM-RIGHT TELEMETRY HUD ─────────────── */}
            <aside className="hidden lg:flex col-span-12 lg:col-span-4 xl:col-span-4 flex-col gap-5 self-end pb-2 border-l border-white/10 pl-6">

              {/* HUD header with line-draw rule */}
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]">
                <span className="text-[#00E5FF] font-black">Telemetry</span>
                <div
                  data-line-draw
                  className="h-px flex-1 bg-[#00E5FF]/50 origin-left shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                />
              </div>

              {/* Data rows — values scramble on mount. Only show rows with real data. */}
              <div className="space-y-3.5">

                {(launch?.name) && (
                  <TelemetryRow
                    label="Upcoming"
                    value={(launch.name || '').slice(0, 26).toUpperCase()}
                    scrambleDelay={1800}
                  />
                )}

                {(() => {
                  const date = launch?.last_updated || (launch?.updatedAt ?? launch?.updated_at);
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
                  return src ? (
                    <TelemetryRow label="Sources" value={src} scrambleDelay={2000} />
                  ) : null;
                })()}

              </div>

              {/* Bottom terminator */}
              <div className="flex items-center gap-3 mt-1 font-mono text-[8px] uppercase tracking-[0.4em] text-zinc-700">
                <span>End of feed</span>
                <div data-line-draw className="h-px flex-1 bg-white/5 origin-left" />
              </div>
            </aside>
          </div>
        </div>

        {/* Scroll-cue line at bottom centre */}
        <div 
          onClick={() => {
            window.scrollTo({
              top: window.innerHeight - 64,
              behavior: 'smooth'
            });
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center group cursor-pointer"
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
            50%      { transform: scaleY(1);   transform-origin: top; opacity: 1; }
          }
        `}</style>
      </section>

      {/* ============================================================ */}
      {/* FEATURED INTEL CAROUSEL                                       */}
      {/* ============================================================ */}
      <section className="relative w-full border-t border-b border-white/10 bg-zinc-950">
        <div className="absolute top-0 left-0 w-full px-6 py-4 flex items-center justify-between z-20 pointer-events-none">
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
            Featured Intel
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1 h-1 bg-white/20" />
            ))}
          </div>
        </div>
        <LandingCarousel slides={buildCarouselSlides(apod, launch, article)} />
      </section>

      {/* ============================================================ */}
      {/* CAPABILITIES GRID                                             */}
      {/* ============================================================ */}
      <section
        data-features-section
        className="relative py-24 md:py-32 px-6 md:px-12 bg-black overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-grid-bg
          src="/grid-bg.png"
          alt=""
          className="absolute inset-0 w-full h-[130%] object-cover opacity-20 pointer-events-none mix-blend-screen will-change-transform"
        />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div data-section-eyebrow className="text-center mb-16 md:mb-24">
            <div className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-[0.5em] mb-3">
              [Capabilities]
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-normal mb-4">
              Mission Capabilities
            </h2>
            <p className="font-mono text-sm text-zinc-500 uppercase tracking-widest">
              Comprehensive telemetry for orbital operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Rocket,
                accent: '#FF6B35',
                title: 'Global Manifest',
                copy: 'Track upcoming orbital launches from all agencies and providers worldwide with real-time countdowns and detailed mission intel.',
              },
              {
                icon: Globe,
                accent: '#18BBF7',
                title: 'Starship Hub',
                copy: "Dedicated telemetry for SpaceX's Starship program. Monitor vehicle statuses, historical test flights, and program milestones.",
              },
              {
                icon: Newspaper,
                accent: '#FF6B35',
                title: 'Orbital News',
                copy: 'Curated feed of the latest spaceflight news and dispatches from trusted aerospace publications.',
              },
              {
                icon: Database,
                accent: '#18BBF7',
                title: 'APOD Archive',
                copy: "Daily astronomical observations and cosmic imagery, provided directly by NASA's Astronomy Picture of the Day API.",
              },
            ].map((feat, i) => (
              <div
                key={i}
                data-feature-card
                className="group relative bg-[#0a0a0a] border border-white/10 p-8 hover:border-white/30 transition-colors will-change-transform"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className="absolute top-0 left-0 w-full h-px scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-700"
                  style={{ background: `linear-gradient(to right, ${feat.accent}, transparent)` }}
                />
                <feat.icon
                  className="w-10 h-10 mb-6 transition-transform duration-300 group-hover:scale-110"
                  style={{ color: feat.accent }}
                />
                <h3 className="text-xl font-bold uppercase tracking-tight mb-3">
                  {feat.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feat.copy}</p>

                {/* Brutalist corner ticks on hover */}
                <div
                  className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ borderColor: feat.accent }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* ATMOSPHERIC FOOTER — PREPARE FOR LIFTOFF                      */}
      {/* ============================================================ */}
      <section
        data-earth-section
        className="relative py-32 px-6 overflow-hidden border-t border-white/10 bg-black flex items-center justify-center min-h-[80vh]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-earth-image
          src="/feature-earth.png"
          alt="Earth from Orbit"
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity will-change-transform"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/20" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <ShieldAlert
            data-earth-icon
            className="w-12 h-12 text-[#18BBF7] mx-auto mb-6 opacity-80 will-change-transform"
          />
          <h2
            data-earth-headline
            className="text-3xl md:text-5xl font-black uppercase tracking-normal mb-6"
          >
            <SplitChars text="Prepare for Liftoff" />
          </h2>
          <p
            data-earth-copy
            className="text-lg text-zinc-300 font-light mb-10 max-w-2xl mx-auto"
          >
            Stay ahead of the curve with our comprehensive launch tracking terminal —
            engineered for aerospace enthusiasts and professionals.
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
