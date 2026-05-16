'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';

// Modern multi-panel page transition. Five vertical strips stagger up to cover
// the page, a loader is held while the next route's data fetches, then the
// strips stagger off the top to reveal the new page.
//
// Key bits:
// - `useTransition` wraps `router.push` so the old page stays mounted (and we
//   stay covered) until the new route's server data is ready. Without this we
//   would slide off too early and reveal Next.js's loading.tsx fallback.
// - Panels start in the covered position on first paint and play an exit-only
//   animation on mount, so a direct visit or hard refresh also gets the
//   transition — no flash of unstyled / unstreamed content.
// - One delegated `document` click listener catches every internal anchor.

const PANEL_COUNT = 5;
const PANEL_DURATION = 0.55;
const PANEL_STAGGER = 0.06;
const LOADER_FADE = 0.2;
// Brief settle delay before the initial mount reveal so React has a chance to
// hydrate and the new route to commit before we lift the curtain.
const INITIAL_REVEAL_DELAY_MS = 300;

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const panelsRef = useRef<HTMLDivElement[]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<'idle' | 'covered' | 'exiting'>('idle');
  const targetPathRef = useRef<string | null>(null);

  // Initial mount — overlay starts covered, animate it off once we're settled.
  useEffect(() => {
    const panels = panelsRef.current.filter(Boolean);
    const loader = loaderRef.current;
    if (panels.length < PANEL_COUNT || !loader) return;

    const id = window.setTimeout(() => {
      gsap.to(loader, { opacity: 0, duration: LOADER_FADE, ease: 'power2.in' });
      gsap.to(panels, {
        y: '-100%',
        duration: PANEL_DURATION,
        stagger: { each: PANEL_STAGGER, from: 'end' },
        ease: 'power3.inOut',
        onComplete: () => {
          // Reset for the next transition
          gsap.set(panels, { y: '100%' });
          gsap.set(loader, { opacity: 0 });
        },
      });
    }, INITIAL_REVEAL_DELAY_MS);

    return () => window.clearTimeout(id);
  }, []);

  // Intercept internal anchor clicks and play the cover animation.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;
      if (!href.startsWith('/') || href.startsWith('//')) return;
      if (anchor.target === '_blank') return;
      if (anchor.hasAttribute('download')) return;
      if (href === pathname) return;
      if (phaseRef.current !== 'idle') return;

      e.preventDefault();
      targetPathRef.current = href;

      const panels = panelsRef.current.filter(Boolean);
      const loader = loaderRef.current;

      gsap.to(panels, {
        y: '0%',
        duration: PANEL_DURATION,
        stagger: PANEL_STAGGER,
        ease: 'power3.inOut',
        onComplete: () => {
          phaseRef.current = 'covered';
          if (loader) {
            gsap.to(loader, {
              opacity: 1,
              duration: LOADER_FADE,
              ease: 'power2.out',
            });
          }
          // useTransition keeps the old page mounted until the new route's
          // data has streamed — isPending tracks the true navigation latency.
          startTransition(() => {
            router.push(href);
          });
        },
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname, router]);

  // Once navigation settles (isPending goes false and the path matches our
  // target), animate the curtain off and reveal the new page.
  useEffect(() => {
    if (phaseRef.current !== 'covered') return;
    if (isPending) return;
    if (targetPathRef.current && pathname !== targetPathRef.current) return;

    phaseRef.current = 'exiting';
    targetPathRef.current = null;

    const panels = panelsRef.current.filter(Boolean);
    const loader = loaderRef.current;

    if (loader) {
      gsap.to(loader, {
        opacity: 0,
        duration: LOADER_FADE,
        ease: 'power2.in',
      });
    }

    requestAnimationFrame(() => {
      gsap.to(panels, {
        y: '-100%',
        duration: PANEL_DURATION,
        stagger: { each: PANEL_STAGGER, from: 'end' },
        ease: 'power3.inOut',
        onComplete: () => {
          phaseRef.current = 'idle';
          gsap.set(panels, { y: '100%' });
        },
      });
    });
  }, [pathname, isPending]);

  return (
    <div aria-hidden className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Five vertical strips — start covered for the initial mount reveal */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: PANEL_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) panelsRef.current[i] = el;
            }}
            className="flex-1 bg-black"
            style={{ transform: 'translateY(0%)' }}
          />
        ))}
      </div>

      {/* Loader — visible while the overlay is covering the page */}
      <div
        ref={loaderRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: 1 }}
      >
        <div className="flex flex-col items-center gap-7">
          {/* Brand mark */}
          <div className="flex items-center gap-3">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full bg-[#FF6B35] opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 bg-[#FF6B35]" />
            </span>
            <span className="font-mono text-xs md:text-sm text-white uppercase tracking-[0.5em] font-black">
              Launch Window
            </span>
          </div>

          {/* Status text */}
          <div className="font-mono text-[10px] text-[#18BBF7] uppercase tracking-[0.4em] animate-pulse">
            Syncing telemetry
          </div>

          {/* Bouncing dots — classic loading rhythm */}
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 bg-[#FF6B35] animate-bounce" />
            <div className="w-1.5 h-1.5 bg-[#18BBF7] animate-bounce [animation-delay:150ms]" />
            <div className="w-1.5 h-1.5 bg-[#FF6B35] animate-bounce [animation-delay:300ms]" />
          </div>
        </div>

        {/* Brutalist corner accents */}
        <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-[#FF6B35]" />
        <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-[#FF6B35]" />
      </div>
    </div>
  );
}
