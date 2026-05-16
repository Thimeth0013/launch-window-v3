'use client';

import { useState, useRef, useEffect } from 'react';
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

function ArticleRow({ article, index }: { article: Article; index: number }) {
  const publishedDate = new Date(article.published_at);
  const hasLaunches = (article.launches?.length || 0) > 0;
  const authors = article.authors || [];
  const isFeatured = !!article.featured;

  return (
    <article
      className={`group relative grid grid-cols-1 md:grid-cols-12 gap-0 border-2 ${
        isFeatured
          ? 'border-[#FF6B35]/40 hover:border-[#FF6B35]'
          : 'border-[#18BBF7]/20 hover:border-[#18BBF7]'
      } bg-black/90 hover:shadow-[0_0_32px_rgba(24,187,247,0.12)] transition-all duration-500`}
    >
      <div className="absolute top-3 left-3 z-20 font-mono text-[10px] text-zinc-700 group-hover:text-[#FF6B35] tracking-widest tabular-nums transition-colors">
        #{String(index + 1).padStart(2, '0')}
      </div>

      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#FF6B35] z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#FF6B35]/0 group-hover:border-[#FF6B35] transition-colors duration-500 z-20 pointer-events-none" />

      <div className="md:col-span-5 relative overflow-hidden border-b-2 md:border-b-0 md:border-r-2 border-inherit min-h-[200px] md:min-h-[280px]">
        {article.image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image_url}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover brightness-90 transition-all duration-700 group-hover:scale-105 group-hover:brightness-100"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-r from-transparent to-black/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
            <Newspaper className="w-12 h-12 text-zinc-800" strokeWidth={1} />
          </div>
        )}
      </div>

      <div className="md:col-span-7 p-6 md:p-8 flex flex-col gap-4">
        <div className="flex items-center flex-wrap gap-3 text-[10px] font-mono uppercase tracking-widest">
          {article.news_site && (
            <span className="font-black text-[#FF6B35]">{article.news_site}</span>
          )}
          {article.news_site && <span className="text-zinc-700">/</span>}
          <span className="flex items-center gap-1 text-zinc-400 tabular-nums">
            <Calendar className="w-3 h-3" />
            {publishedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {isFeatured && (
            <>
              <span className="text-zinc-700">/</span>
              <span className="flex items-center gap-1 text-[#FF6B35]">
                <Star className="w-3 h-3 fill-[#FF6B35]" />
                Featured
              </span>
            </>
          )}
          {hasLaunches && (
            <>
              <span className="text-zinc-700">/</span>
              <span className="flex items-center gap-1 text-[#18BBF7]">
                <Rocket className="w-3 h-3" />
                Launch linked
              </span>
            </>
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight text-white group-hover:text-[#18BBF7] transition-colors">
          {article.title}
        </h2>

        {article.summary && (
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed line-clamp-4">
            {article.summary}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
            {authors.length > 0 ? (
              <>
                <span className="text-zinc-700">By </span>
                <span className="text-zinc-400">
                  {authors.map((a) => a.name).filter(Boolean).join(', ') || 'Staff'}
                </span>
              </>
            ) : (
              <span>Anonymous Dispatch</span>
            )}
          </div>

          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/cta inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#FF6B35] text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-colors whitespace-nowrap"
            >
              <span>Read{article.news_site ? ` on ${article.news_site}` : ''}</span>
              <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ArticlesFeed({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);

  // Scroll-triggered fade-in for the article rows. Runs once on mount; search
  // filtering doesn't re-run animations (keystroke-by-keystroke flicker is
  // worse than letting filtered-back-in cards appear at their natural state).
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

  const filtered = articles.filter((a) => {
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
              className={`w-3 h-3 md:w-4 md:h-4 transition-colors duration-300 ${
                query ? 'text-[#18BBF7]' : 'text-gray-600'
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
        <div ref={feedRef} className="space-y-6 md:space-y-8">
          {filtered.map((article, index) => (
            <div key={article.id} data-article-card>
              <ArticleRow article={article} index={index} />
            </div>
          ))}
        </div>
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
