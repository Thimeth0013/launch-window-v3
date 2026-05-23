'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import gsap from 'gsap';
import Link from 'next/link';
import { ChevronRight, ExternalLink, Telescope, Rocket, Newspaper } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface CarouselSlide {
  id: string;
  index: string;            // "[01]", "[02]", "[03]"
  label: string;
  accent: string;           // hex colour
  imageSrc?: string;
  imageAlt?: string;
  metaLine: string;
  title: string;
  description?: string;
  ctaLabel: string;
  ctaHref: string;
  ctaExternal?: boolean;
  secondaryLabel?: string;
  secondaryHref?: string;
  icon: React.ReactNode;
}

interface LandingCarouselProps {
  slides: CarouselSlide[];
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function LandingCarousel({ slides }: LandingCarouselProps) {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const progressTweenRef = useRef<gsap.core.Tween | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const goNextRef = useRef<() => void>(undefined);

  const AUTOPLAY_DELAY = 6000;

  /* ── Populate DOM for current slide ────────────────────────────── */
  const populateSlide = useCallback((idx: number) => {
    const s = slides[idx];
    if (!s) return;

    if (metaRef.current) metaRef.current.textContent = s.metaLine;
    if (titleRef.current) titleRef.current.textContent = s.title;
    if (descRef.current) {
      descRef.current.textContent = s.description || '';
      descRef.current.style.display = s.description ? 'block' : 'none';
    }

    // Update accent colours
    if (indexRef.current) {
      const span = indexRef.current.querySelector('[data-accent]') as HTMLElement;
      if (span) { span.style.color = s.accent; span.textContent = s.index; }
      const label = indexRef.current.querySelector('[data-label]') as HTMLElement;
      if (label) label.textContent = s.label;
    }
  }, [slides]);

  /* ── Animate to next slide ─────────────────────────────────────── */
  const goTo = useCallback((nextIdx: number) => {
    if (isAnimating.current || nextIdx === active) return;
    isAnimating.current = true;

    const nextSlide = slides[nextIdx];
    if (!nextSlide) return;

    // kill any running timeline and stop the progress bar
    if (tlRef.current) tlRef.current.kill();
    if (progressTweenRef.current) progressTweenRef.current.kill();
    if (progressRef.current) gsap.set(progressRef.current, { scaleX: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        isAnimating.current = false;

        // Start the progress bar for the next slide
        if (progressRef.current) {
          progressTweenRef.current = gsap.fromTo(progressRef.current,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: AUTOPLAY_DELAY / 1000,
              ease: 'none',
              onComplete: () => goNextRef.current && goNextRef.current()
            }
          );
        }
      },
    });
    tlRef.current = tl;

    // Get current and next image elements for smooth crossfade
    const images = containerRef.current?.querySelectorAll('[data-carousel-image]');
    const currentImg = images?.[active];
    const nextImg = images?.[nextIdx];

    const elements = {
      meta: metaRef.current,
      title: titleRef.current,
      desc: descRef.current,
      cta: ctaRef.current,
      index: indexRef.current,
      icon: iconRef.current,
    };

    // ─── Phase 1: Animate OUT current elements ───
    if (currentImg) {
      tl.to(currentImg, { opacity: 0, scale: 1.08, duration: 0.5 }, 0);
    }
    tl.to(elements.meta, { opacity: 0, y: -20, duration: 0.35 }, 0.05);
    tl.to(elements.title, { opacity: 0, x: -40, duration: 0.4 }, 0.08);
    tl.to(elements.desc, { opacity: 0, y: 20, duration: 0.35 }, 0.1);
    tl.to(elements.cta, { opacity: 0, y: 30, duration: 0.35 }, 0.12);
    tl.to(elements.index, { opacity: 0, x: 20, duration: 0.3 }, 0.05);

    // ─── Phase 2: Swap content ───
    tl.call(() => {
      populateSlide(nextIdx);
      setActive(nextIdx);
    }, [], 0.5);

    // Accent bar flash on the overlay
    tl.to(overlayRef.current, {
      background: `linear-gradient(135deg, ${nextSlide.accent}15 0%, transparent 50%, black 100%)`,
      duration: 0.6,
    }, 0.45);

    // ─── Phase 3: Animate IN new elements ───
    if (nextImg) {
      tl.fromTo(nextImg,
        { opacity: 0, scale: 1.15 },
        { opacity: 1, scale: 1, duration: 0.7 },
        0.55,
      );
    }
    tl.fromTo(elements.index,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.35 },
      0.6,
    );
    tl.fromTo(elements.meta,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4 },
      0.65,
    );
    tl.fromTo(elements.title,
      { opacity: 0, x: 60, skewX: -4 },
      { opacity: 1, x: 0, skewX: 0, duration: 0.5, ease: 'power3.out' },
      0.7,
    );
    tl.fromTo(elements.desc,
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.4 },
      0.8,
    );
    tl.fromTo(elements.cta,
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.4)' },
      0.85,
    );
  }, [active, slides, populateSlide]);

  /* ── Navigation helpers ────────────────────────────────────────── */
  const goNext = useCallback(() => {
    goTo((active + 1) % slides.length);
  }, [active, slides.length, goTo]);

  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  /* ── Initial entrance animation ────────────────────────────────── */
  useEffect(() => {
    populateSlide(0);

    const entrance = gsap.timeline({
      defaults: { ease: 'power3.out' },
      delay: 0.2,
      onComplete: () => {
        if (progressRef.current) {
          progressTweenRef.current = gsap.fromTo(progressRef.current,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: AUTOPLAY_DELAY / 1000,
              ease: 'none',
              onComplete: () => goNextRef.current && goNextRef.current()
            }
          );
        }
      }
    });

    const firstImg = containerRef.current?.querySelector('[data-carousel-image]');
    if (firstImg) {
      entrance.fromTo(firstImg,
        { opacity: 0, scale: 1.2 },
        { opacity: 1, scale: 1, duration: 1 },
      );
    }
    entrance.fromTo(indexRef.current,
      { opacity: 0, y: -15 },
      { opacity: 1, y: 0, duration: 0.4 },
      0.3,
    );
    entrance.fromTo(metaRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 },
      0.4,
    );
    entrance.fromTo(titleRef.current,
      { opacity: 0, x: 80, skewX: -6 },
      { opacity: 1, x: 0, skewX: 0, duration: 0.7 },
      0.5,
    );
    entrance.fromTo(descRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5 },
      0.7,
    );
    entrance.fromTo(ctaRef.current,
      { opacity: 0, y: 40, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)' },
      0.8,
    );

    return () => { entrance.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoplay is seamlessly managed by GSAP timelines linking goTo and goNext.

  return (
    <div ref={containerRef} className="relative w-full h-[85vh] md:h-[90vh] overflow-hidden bg-black">
      {/* Background images for smooth hardware-accelerated crossfading */}
      {slides.map((s, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.id}
          data-carousel-image
          src={s.imageSrc || '/feature-earth.png'}
          alt={s.imageAlt || ''}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: idx === 0 ? 1 : 0,
            willChange: 'transform, opacity',
            display: s.imageSrc ? 'block' : 'none',
          }}
        />
      ))}

      {/* Gradient overlays */}
      <div ref={overlayRef} className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

      {/* Index label (top-right) */}
      <div
        ref={indexRef}
        className="absolute top-6 right-8 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]"
        style={{ willChange: 'transform, opacity' }}
      >
        <span data-accent className="font-black text-[#FF6B35]">[01]</span>
        <span className="text-zinc-500">/</span>
        <span data-label className="text-zinc-300 font-bold">—</span>
      </div>

      {/* Content — extra bottom padding so CTAs clear the nav/dots/progress bar */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-12 lg:p-16 pb-32 md:pb-36">
        <div className="max-w-3xl">
          <p
            ref={metaRef}
            className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] mb-3"
            style={{ color: '#18BBF7', willChange: 'transform, opacity' }}
          >
            —
          </p>
          <h3
            ref={titleRef}
            className="text-2xl md:text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-[0.95] mb-4"
            style={{ willChange: 'transform, opacity' }}
          >
            —
          </h3>
          <p
            ref={descRef}
            className="text-sm md:text-base text-zinc-300 mb-6 max-w-2xl leading-relaxed"
            style={{ willChange: 'transform, opacity' }}
          >
            —
          </p>
          <div
            ref={ctaRef}
            className="flex flex-wrap items-center gap-4"
            style={{ willChange: 'transform, opacity' }}
          >
            {/* CTA is populated per slide via carousel data; we render both link types */}
            {slides.map((s, i) => (
              <div key={s.id} className={i === active ? 'contents' : 'hidden'}>
                {s.ctaExternal ? (
                  <a
                    href={s.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/cta inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-black transition-all duration-300"
                  >
                    {s.ctaLabel}
                    <ExternalLink className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                  </a>
                ) : (
                  <Link
                    href={s.ctaHref}
                    className="group/cta inline-flex items-center gap-2 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest font-black transition-all duration-300 hover:brightness-125"
                    style={{ backgroundColor: s.accent, color: '#000' }}
                  >
                    {s.ctaLabel}
                    <ChevronRight className="w-3 h-3 transition-transform group-hover/cta:translate-x-1" />
                  </Link>
                )}
                {s.secondaryHref && (
                  <Link
                    href={s.secondaryHref}
                    className="font-mono text-[9px] text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    {s.secondaryLabel} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-6 right-6 md:right-12 z-20 flex items-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { goTo(i); }}
            className="group flex flex-col items-center gap-1"
            aria-label={`Go to slide ${i + 1}`}
          >
            <span
              className="block w-8 h-0.5 transition-all duration-500"
              style={{
                backgroundColor: i === active ? s.accent : 'rgba(255,255,255,0.2)',
                transform: i === active ? 'scaleX(1)' : 'scaleX(0.6)',
              }}
            />
            <span className="font-mono text-[8px] text-zinc-600 group-hover:text-zinc-300 transition-colors">
              {s.index}
            </span>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 z-20">
        <div
          ref={progressRef}
          className="h-full origin-left"
          style={{ backgroundColor: slides[active]?.accent || '#FF6B35' }}
        />
      </div>

      {/* Hidden icon ref (unused visually but keeps ref consistent) */}
      <div ref={iconRef} className="hidden" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helper: Build slide data from server props                          */
/* ------------------------------------------------------------------ */

export function buildCarouselSlides(
  apod: any,
  launch: any,
  article: any,
): CarouselSlide[] {
  const slides: CarouselSlide[] = [];

  // Slide 1 — APOD
  const apodImage = apod?.media_type === 'image' ? apod.url : apod?.thumbnail_url;
  slides.push({
    id: 'apod',
    index: '[01]',
    label: 'Cosmic Observation',
    accent: '#FF6B35',
    imageSrc: apodImage,
    imageAlt: apod?.title || 'NASA APOD',
    metaLine: `NASA / Astronomy Picture Of The Day / ${apod?.date || '—'}`,
    title: apod?.title || 'Cosmic feed unavailable',
    description: apod?.explanation || undefined,
    ctaLabel: apod?.media_type === 'video' ? 'Watch Source' : 'View HD',
    ctaHref: apod?.hdurl || apod?.url || '#',
    ctaExternal: true,
    icon: <Telescope className="w-10 h-10" />,
  });

  // Slide 2 — Next Launch
  slides.push({
    id: 'launch',
    index: '[02]',
    label: 'Next Primary Objective',
    accent: '#18BBF7',
    imageSrc: launch?.image?.image_url,
    imageAlt: launch?.name || 'Upcoming launch',
    metaLine: `${launch?.launch_service_provider?.name || 'Unknown Provider'} / ${launch?.pad?.location?.name || 'Unknown Pad'}`,
    title: launch?.name || 'No launch on manifest',
    description: launch ? `Window: ${new Date(launch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(launch.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}` : undefined,
    ctaLabel: 'Mission Intel',
    ctaHref: launch ? `/launches/${launch.slug}` : '/launches',
    ctaExternal: false,
    secondaryLabel: 'All Launches',
    secondaryHref: '/launches',
    icon: <Rocket className="w-10 h-10" />,
  });

  // Slide 3 — Article
  slides.push({
    id: 'article',
    index: '[03]',
    label: 'Orbital News Feed',
    accent: '#FF6B35',
    imageSrc: article?.image_url,
    imageAlt: article?.title || 'Space article',
    metaLine: `${article?.news_site || 'Unknown Source'} / ${article ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}`,
    title: article?.title || 'No dispatches available',
    description: article?.summary,
    ctaLabel: 'Read Full Article',
    ctaHref: article?.url || '/articles',
    ctaExternal: !!article?.url,
    secondaryLabel: 'Other News',
    secondaryHref: '/articles',
    icon: <Newspaper className="w-10 h-10" />,
  });

  return slides;
}
