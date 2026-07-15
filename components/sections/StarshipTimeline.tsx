'use client';

import { forwardRef, useCallback, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ChevronLeft, ChevronRight, Play, Info } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface StarshipTimelineProps {
  items: any[];
}

// Vertical page-scroll drives horizontal movement of the track (à la
// vanmorrison.com/music): the section pins while the track slides left by
// exactly the amount it overflows the viewport, so 1 scroll-px == 1 track-px.
// Below md, or when the visitor prefers reduced motion, we skip the pin
// entirely and fall back to a native swipe-scrollable row.
export default function StarshipTimeline({ items }: StarshipTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const yearRefs = useRef<Record<string, HTMLElement | null>>({});
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  // Newest/upcoming first (left), sliding back through history as the user scrolls.
  const sorted = [...items].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : -Infinity;
    const tb = b.date ? new Date(b.date).getTime() : -Infinity;
    return tb - ta;
  });

  const withYear = sorted.map((item) => {
    const dt = item.date ? new Date(item.date) : null;
    const year = dt && !isNaN(dt.getTime()) ? dt.getFullYear().toString() : 'Unknown';
    return { item, year };
  });

  const entries = withYear.map((entry, i) => ({
    ...entry,
    isNewYear: i === 0 || entry.year !== withYear[i - 1].year,
  }));

  const years = entries.filter((e) => e.isNewYear).map((e) => e.year);
  const [activeYear, setActiveYear] = useState(() => years[0] ?? '');

  useGSAP(
    () => {
      const track = trackRef.current;
      const container = containerRef.current;
      if (!track || !container) return;

      const mm = gsap.matchMedia();

      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const getScrollAmount = () => Math.max(0, track.scrollWidth - container.offsetWidth);

        const tween = gsap.to(track, {
          x: () => -getScrollAmount(),
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            start: 'top top',
            end: () => `+=${getScrollAmount()}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const scrolled = self.progress * getScrollAmount();
              let current = years[0];
              years.forEach((y) => {
                const marker = yearRefs.current[y];
                if (marker && marker.offsetLeft <= scrolled + 60) current = y;
              });
              setActiveYear(current);
            },
          },
        });

        scrollTriggerRef.current = tween.scrollTrigger ?? null;

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          scrollTriggerRef.current = null;
        };
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [items] }
  );

  const jumpToYear = useCallback((year: string) => {
    const marker = yearRefs.current[year];
    if (!marker) return;

    const st = scrollTriggerRef.current;
    if (st) {
      window.scrollTo({ top: st.start + marker.offsetLeft, behavior: 'smooth' });
    } else {
      marker.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  }, []);

  // Snap to the next/previous card's left edge — one card per click, never
  // overshooting past it — instead of a fixed pixel step.
  const nudge = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    const cards = cardRefs.current.filter((c): c is HTMLElement => c !== null);
    if (!cards.length) return;

    const st = scrollTriggerRef.current;
    const scrolled = st ? window.scrollY - st.start : track.scrollLeft;

    const targetLeft = direction > 0
      ? cards.find((c) => c.offsetLeft > scrolled + 4)?.offsetLeft ?? cards[cards.length - 1].offsetLeft
      : [...cards].reverse().find((c) => c.offsetLeft < scrolled - 4)?.offsetLeft ?? 0;

    if (st) {
      const target = Math.min(st.end, Math.max(st.start, st.start + targetLeft));
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      track.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex flex-col justify-center py-12 md:min-h-screen md:py-0"
    >
      {/* Current year — its own row, always fully in view, updates live as you scroll */}
      <div className="mt-8 mb-2 md:mb-4 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl md:text-2xl font-black text-white tracking-tighter leading-none tabular-nums">
            {activeYear}
          </span>
          <span className="font-mono text-sm md:text-md font-black text-white tracking-tighter leading-none tabular-nums uppercase">
            / Starbase Timeline
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll timeline left"
            className="p-2 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Scroll timeline right"
            className="p-2 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto md:overflow-hidden pb-4 md:pb-0 -mb-4 md:mb-0">
        <div ref={trackRef} className="flex items-stretch gap-5 md:gap-7 pr-6 md:pr-16 w-max">
          {entries.map(({ item, year, isNewYear }, i) => (
            <TimelineEventCard
              key={`${item._bucket}-${item._type}-${item.id ?? i}`}
              item={item}
              ref={(el: HTMLElement | null) => {
                cardRefs.current[i] = el;
                if (isNewYear) yearRefs.current[year] = el;
              }}
            />
          ))}
        </div>
      </div>

      {/* Jump To — horizontal, sits below the track and stays in view for the whole pin */}
      <nav className="mt-6 md:mt-8 flex items-center gap-2 overflow-x-auto md:flex-wrap">
        <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mr-2 shrink-0">
          Jump To
        </span>
        {years.map((year) => {
          const isActive = activeYear === year;
          return (
            <button
              key={year}
              type="button"
              onClick={() => jumpToYear(year)}
              className={`shrink-0 font-mono text-xs px-3 py-1.5 border transition-colors ${
                isActive
                  ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-white font-black'
                  : 'border-white/10 text-zinc-500 hover:text-white hover:border-white/30'
              }`}
            >
              {year}
            </button>
          );
        })}
      </nav>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline Event Card                                                 */
/* ------------------------------------------------------------------ */

const TimelineEventCard = forwardRef<HTMLElement, { item: any }>(function TimelineEventCard({ item }, ref) {
  const dt = item.date ? new Date(item.date) : null;
  const isLaunch = item._type === 'launch';

  // Define type name and color
  const typeName = isLaunch ? 'Test Flight' : (item.type?.name || 'Event');
  const typeNameLower = typeName.toLowerCase();

  // Distinct colors
  let typeColorClass = 'text-zinc-400 border-zinc-500/30 bg-zinc-500/5';

  if (isLaunch || typeNameLower.includes('flight') || typeNameLower.includes('launch')) {
    typeColorClass = 'text-[#18BBF7] border-[#18BBF7]/30 bg-[#18BBF7]/5';
  } else if (typeNameLower.includes('fire') || typeNameLower.includes('test')) {
    typeColorClass = 'text-[#FF6B35] border-[#FF6B35]/30 bg-[#FF6B35]/5';
  }

  const imageUrl = item.image?.image_url || item.image?.thumbnail_url || item.feature_image;
  const description = item.mission?.description || item.description || 'No additional details available.';
  const hasLinks = item.vid_urls?.length > 0 || item.info_urls?.length > 0 || item.info_url || item.vid_url;

  return (
    <article ref={ref} className="group relative shrink-0 w-220 aspect-video overflow-hidden bg-black">
      {imageUrl ? (
        <OptimizedImage
          src={imageUrl}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
        />
      ) : (
        <div className="absolute inset-0 bg-white/3" />
      )}

      {/* Base gradient — keeps meta/title legible over the image at rest */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-black/10" />

      {/* Hover — fully darken so the description reads clearly */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-500" />

      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
        {/* Description + links — collapsed to zero height until hover */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
          <div className="overflow-hidden pb-6 md:pb-4">
            <p className="text-zinc-300 text-xs md:text-sm leading-relaxed line-clamp-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
              {description}
            </p>

            {hasLinks && (
              <div className="flex flex-wrap items-center gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                {(item.vid_urls?.[0]?.url || item.vid_url) && (
                  <a
                    href={item.vid_urls?.[0]?.url || item.vid_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-black px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest font-black hover:bg-[#FF6B35] hover:text-white transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Watch Replay
                  </a>
                )}

                {(item.info_urls?.[0]?.url || item.info_url) && (
                  <a
                    href={item.info_urls?.[0]?.url || item.info_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-white/20 text-white px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest hover:border-white/50 transition-colors"
                  >
                    <Info className="w-3 h-3" />
                    More Info
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meta row — always visible */}
        <div className="flex flex-wrap items-center gap-2 mb-3 font-mono text-[10px] uppercase tracking-widest">
          <span className={`${item._bucket === 'upcoming' ? 'text-[#FF6B35]' : 'text-zinc-500'} font-black`}>
            {item._bucket === 'upcoming' ? 'Upcoming' : 'Past'}
          </span>
          <span className="text-zinc-700">/</span>
          <span className={`px-2 py-0.5 border ${typeColorClass} font-black`}>
            {typeName}
          </span>
          {dt && (
            <>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-400">
                {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </>
          )}
        </div>

        {/* Title — always visible */}
        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-[1.1] line-clamp-2">
          {item.name}
        </h3>
      </div>
    </article>
  );
});
