'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { Newspaper, ExternalLink, Rocket, Star, Calendar, Search, X } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  url?: string;
  image_url?: string;
  news_site?: string;
  summary?: string;
  published_at: string | Date;
  updated_at?: string | Date;
  featured?: boolean;
  authors?: Array<{ name?: string }>;
  launches?: Array<{ launch_id?: string; provider?: string }>;
}

const PAGE_SIZE = 25;

function ArticleRow({ article, index }: { article: Article; index: number }) {
  const publishedDate = new Date(article.published_at);
  const hasLaunches = (article.launches?.length || 0) > 0;
  const authors = article.authors || [];
  const isFeatured = !!article.featured;

  const thumbnail = (
    <div className="relative w-32 sm:w-40 md:w-74 aspect-video shrink-0 overflow-hidden bg-zinc-950">
      {article.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image_url}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Newspaper className="w-8 h-8 text-zinc-800" strokeWidth={1} />
        </div>
      )}
    </div>
  );

  const content = (
    <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
      <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight leading-snug text-white group-hover:text-[#18BBF7] transition-colors line-clamp-2">
        {article.title}
      </h2>

      {article.summary && (
        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed line-clamp-1 md:line-clamp-2">
          {article.summary}
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 overflow-hidden">
        {article.news_site && (
          <span className="shrink-0 font-black text-[#FF6B35]">{article.news_site}</span>
        )}
        {article.news_site && <span className="shrink-0 text-zinc-700">/</span>}
        <span className="shrink-0 flex items-center gap-1 tabular-nums">
          <Calendar className="w-3 h-3" />
          {publishedDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        {isFeatured && <Star className="shrink-0 w-3 h-3 text-[#FF6B35] fill-[#FF6B35]" />}
        {hasLaunches && <Rocket className="shrink-0 w-3 h-3 text-[#18BBF7]" />}
        <span className="shrink-0 text-zinc-700">/</span>
        <span className="min-w-0 truncate">
          {authors.length > 0 ? (
            <>
              <span className="text-zinc-700">By </span>
              {authors.map((a) => a.name).filter(Boolean).join(', ') || 'Staff'}
            </>
          ) : (
            'Anonymous'
          )}
        </span>
      </div>
    </div>
  );

  const externalIcon = article.url && (
    <ExternalLink className="w-4 h-4 shrink-0 self-start mt-0.5 text-zinc-700 group-hover:text-[#18BBF7] transition-colors" />
  );

  const rowClassName = 'group flex items-start gap-4 sm:gap-5 py-1.5';

  return article.url ? (
    <a href={article.url} target="_blank" rel="noopener noreferrer" className={rowClassName}>
      {thumbnail}
      {content}
      {externalIcon}
    </a>
  ) : (
    <div className={rowClassName}>
      {thumbnail}
      {content}
    </div>
  );
}

export default function ArticlesFeed({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState('');
  const [loadedArticles, setLoadedArticles] = useState<Article[]>(articles);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(articles.length === PAGE_SIZE);
  const feedRef = useRef<HTMLDivElement>(null);
  // Tracks IDs of newly appended articles so we animate only them
  const newIdsRef = useRef<Set<number>>(new Set());

  // Initial scroll-triggered fade-in (runs once on mount)
  useEffect(() => {
    if (!feedRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-article-card]');
      if (cards.length === 0) return;
      gsap.set(cards, { opacity: 0, y: 60 });

      ScrollTrigger.batch('[data-article-card]', {
        start: 'top 85%',
        onEnter: (elements) => {
          gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power2.out',
            overwrite: true,
          });
        },
      });
    }, feedRef);

    return () => ctx.revert();
  }, []);

  // Animate only newly-loaded cards after state update
  useEffect(() => {
    if (newIdsRef.current.size === 0) return;
    newIdsRef.current = new Set();

    // Wait one tick so the new DOM nodes are painted
    requestAnimationFrame(() => {
      const newCards = Array.from(
        feedRef.current?.querySelectorAll<HTMLElement>('[data-article-card][data-new]') ?? []
      );
      if (newCards.length === 0) return;
      gsap.fromTo(
        newCards,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
          onComplete: () => newCards.forEach((c) => c.removeAttribute('data-new')),
        }
      );
    });
  }, [loadedArticles]);

  // Force-reveal all cards when searching (avoids stuck opacity-0)
  useEffect(() => {
    if (!query) return;
    const feed = feedRef.current;
    if (!feed) return;
    const cards = Array.from(feed.querySelectorAll<HTMLElement>('[data-article-card]'));
    if (cards.length === 0) return;
    gsap.to(cards, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', overwrite: true });
  }, [query]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/articles?limit=${PAGE_SIZE}&offset=${loadedArticles.length}`);
      if (!res.ok) throw new Error('fetch failed');
      const next: Article[] = await res.json();

      // Tag new IDs before state update so the animation effect sees them
      newIdsRef.current = new Set(next.map((a) => a.id));

      setLoadedArticles((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch {
      // Silently fail — keep existing articles visible
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, loadedArticles.length]);

  const filtered = loadedArticles.filter((a) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.summary?.toLowerCase().includes(q) ||
      a.news_site?.toLowerCase().includes(q) ||
      a.authors?.some((au) => au.name?.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* Title row with search on the right */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl tracking-tighter font-black uppercase text-white">
            Latest Briefings<span className="text-[#FF6B35]">.</span>
          </h1>
          <p className="text-gray-500 font-mono text-xs uppercase ml-1 tracking-[0.2em] mt-2">
            Orbital News Archive // {filtered.length} {filtered.length === 1 ? 'Dispatch' : 'Dispatches'} // Sources open externally
          </p>
        </div>

        <div className="relative group w-full md:w-96 lg:w-130">
          <div className="absolute inset-y-0 left-3 md:left-4 flex items-center pointer-events-none">
            <Search
              className={`w-3 h-3 md:w-4 md:h-4 transition-colors duration-300 ${query ? 'text-[#18BBF7]' : 'text-gray-600'
                }`}
            />
          </div>

          <input
            type="text"
            placeholder="SEARCH BRIEFINGS..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 pl-9 pr-9 md:pl-12 md:pr-12 text-white font-mono text-[10px] md:text-sm tracking-widest focus:outline-none border border-[#18BBF7]/40 focus:border-[#18BBF7] transition-all placeholder:text-gray-600 bg-transparent"
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-3 md:right-4 flex items-center text-gray-500 hover:text-[#FF6B35] transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      {filtered.length > 0 ? (
        <>
          <div ref={feedRef} className="space-y-4 md:space-y-6">
            {filtered.map((article, index) => (
              <div
                key={article.id}
                data-article-card
                {...(newIdsRef.current.has(article.id) ? { 'data-new': '' } : {})}
              >
                <ArticleRow article={article} index={index} />
              </div>
            ))}
          </div>

          {/* Load More — hidden while searching, hidden when nothing left */}
          {!query && hasMore && (
            <div className="flex justify-center mt-8">
              <button
                id="articles-load-more"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="border border-white/20 text-white px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-white/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}

          {/* End of feed indicator — shows once fully exhausted */}
          {!query && !hasMore && loadedArticles.length > PAGE_SIZE && (
            <div className="mt-12 flex flex-col items-center gap-2">
              <div className="w-px h-8 bg-gradient-to-b from-[#18BBF7]/40 to-transparent" />
              <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-[0.4em]">
                End of Archive — {loadedArticles.length} Dispatches
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 border border-dashed border-zinc-900 bg-[#050505]">
          <Newspaper className="w-16 h-16 text-zinc-900 mb-6" strokeWidth={1} />
          <p className="text-zinc-600 font-mono text-sm uppercase tracking-[0.3em]">
            {query ? 'No matching briefings' : 'No Dispatches Found'}
          </p>
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="mt-6 px-6 py-2 border border-[#18BBF7]/30 text-[#18BBF7] text-[10px] font-black hover:bg-[#18BBF7] hover:text-black transition-all uppercase tracking-widest"
            >
              Clear Filter
            </button>
          ) : (
            <p className="text-zinc-700 font-mono text-[10px] uppercase tracking-widest mt-2">
              The archive is empty. Check back shortly.
            </p>
          )}
        </div>
      )}
    </>
  );
}