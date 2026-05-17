'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';

// Snappy crossfade page transition. The previous staggered-curtain animation
// burned ~1.6s of total chrome time, which meant the page's own GSAP entrance
// timelines (HomeAnimator, SlugScrollAnimator, etc.) would finish behind the
// overlay before it lifted. Users never saw them play. This version uses a
// quick opacity crossfade — total chrome time is ~300ms — so any page-level
// entrance animation is still in-flight at the moment of reveal.
//
// `useTransition` wraps `router.push` so the overlay stays covered until the
// new route's server data has actually streamed. No `next.js loading.tsx`
// fallback ever shows underneath.

const COVER_FADE = 0.16; // overlay opacity 0→1 (or back) duration in seconds
const LOADER_FADE = 0.12;
// Brief settle delay before the initial mount reveal so React has a chance to
// hydrate and the route to commit before we lift the overlay.
const INITIAL_REVEAL_DELAY_MS = 150;

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const overlayRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<'idle' | 'covered' | 'exiting'>('idle');
  const targetPathRef = useRef<string | null>(null);

  // Initial mount: overlay starts opaque (so there's no flash of unstyled
  // content while React hydrates), then quickly fades off.
  useEffect(() => {
    const overlay = overlayRef.current;
    const loader = loaderRef.current;
    if (!overlay || !loader) return;

    const id = window.setTimeout(() => {
      gsap.to(loader, { opacity: 0, duration: LOADER_FADE, ease: 'power2.in' });
      gsap.to(overlay, {
        opacity: 0,
        duration: COVER_FADE,
        ease: 'power2.out',
        onComplete: () => {
          overlay.style.pointerEvents = 'none';
        },
      });
    }, INITIAL_REVEAL_DELAY_MS);

    return () => window.clearTimeout(id);
  }, []);

  // Intercept internal anchor clicks
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

      const overlay = overlayRef.current;
      const loader = loaderRef.current;
      if (!overlay || !loader) return;

      overlay.style.pointerEvents = 'auto';

      gsap.to(overlay, {
        opacity: 1,
        duration: COVER_FADE,
        ease: 'power2.in',
        onComplete: () => {
          phaseRef.current = 'covered';
          gsap.to(loader, { opacity: 1, duration: LOADER_FADE, ease: 'power2.out' });
          // useTransition keeps the old page mounted until the new route's
          // data has streamed — isPending tracks true navigation latency.
          startTransition(() => {
            router.push(href);
          });
        },
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname, router]);

  // After navigation settles (isPending goes false and the path matches our
  // target), fade the overlay back off. The new page is now visible and any
  // mount-time animations on it can play in the window the user actually sees.
  useEffect(() => {
    if (phaseRef.current !== 'covered') return;
    if (isPending) return;
    if (targetPathRef.current && pathname !== targetPathRef.current) return;

    phaseRef.current = 'exiting';
    targetPathRef.current = null;

    const overlay = overlayRef.current;
    const loader = loaderRef.current;
    if (!overlay || !loader) return;

    gsap.to(loader, { opacity: 0, duration: LOADER_FADE * 0.8, ease: 'power2.in' });

    requestAnimationFrame(() => {
      gsap.to(overlay, {
        opacity: 0,
        duration: COVER_FADE,
        ease: 'power2.out',
        onComplete: () => {
          phaseRef.current = 'idle';
          overlay.style.pointerEvents = 'none';
        },
      });
    });
  }, [pathname, isPending]);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl"
      style={{ opacity: 1, pointerEvents: 'auto' }}
    >
      <div
        ref={loaderRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: 1 }}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="flex items-center gap-3">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full bg-[#FF6B35] opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 bg-[#FF6B35]" />
            </span>
            <span className="font-mono text-xs text-white uppercase tracking-[0.5em] font-black">
              Launch Window
            </span>
          </div>

          {/* Thin horizontal scan line — moves continuously so the loader
              reads as "active" even when only visible for ~150ms. */}
          <div className="relative w-64 h-px bg-white/10 overflow-hidden">
            <div
              className="absolute inset-y-0 w-1/2 bg-[#FF6B35]"
              style={{
                animation: 'pt-scan 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>

        {/* Brutalist corner accents — small + low-contrast so they don't
            steal attention when the overlay flashes through. */}
        <div className="absolute top-5 left-5 w-3 h-3 border-t-2 border-l-2 border-[#FF6B35]/60" />
        <div className="absolute bottom-5 right-5 w-3 h-3 border-b-2 border-r-2 border-[#FF6B35]/60" />
      </div>

      <style>{`
        @keyframes pt-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
