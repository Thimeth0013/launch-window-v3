'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import ArticleCard from '@/components/ui/ArticleCard';

interface Article {
  id: number;
  title: string;
  url?: string;
  image_url?: string;
  news_site?: string;
  summary?: string;
  published_at: string | Date;
  featured?: boolean;
  launches?: Array<{ launch_id?: string; provider?: string }>;
}

const AUTO_ADVANCE_MS = 5000;

export default function ArticlesCarousel({ articles }: { articles: Article[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const getStep = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 360;
    const card = el.querySelector<HTMLElement>('[data-article-card]');
    if (!card) return 360;
    // Card width + the gap (we use gap-6 = 24px on the flex container)
    return card.offsetWidth + 24;
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = getStep();
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  }, [getStep]);

  // Auto-advance
  useEffect(() => {
    if (isPaused || articles.length <= 1) return;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: getStep(), behavior: 'smooth' });
      }
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [isPaused, articles.length, getStep]);

  // Update arrow enable/disable state as the user scrolls
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState]);

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-900 bg-[#050505]">
        <Newspaper className="w-12 h-12 text-zinc-800 mb-4" strokeWidth={1} />
        <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em]">
          No Dispatches Available
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
    >
      {/* Manual controls — overlapping the carousel top edge, mirroring TimelineEngine */}
      <div className="absolute -top-14 right-0 flex items-center gap-3 z-10">
        <span className="hidden md:inline font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
          {isPaused ? 'Paused' : 'Auto'}
        </span>
        <div className="flex items-center -space-x-px">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Previous articles"
            className={`p-2 border border-zinc-800 transition-colors ${
              canScrollLeft
                ? 'hover:bg-zinc-800 text-zinc-300 hover:text-white'
                : 'text-zinc-700 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Next articles"
            className={`p-2 border border-zinc-800 transition-colors ${
              canScrollRight
                ? 'hover:bg-zinc-800 text-zinc-300 hover:text-white'
                : 'text-zinc-700 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scroll track */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth pb-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {articles.map((article) => (
          <div
            key={article.id}
            data-article-card
            className="snap-start shrink-0 w-[300px] sm:w-[340px] md:w-[380px]"
          >
            <ArticleCard article={article} />
          </div>
        ))}
      </div>
    </div>
  );
}
