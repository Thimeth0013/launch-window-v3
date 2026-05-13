import Link from 'next/link';
import { ChevronLeft, Newspaper, ExternalLink, Rocket, Star, Calendar } from 'lucide-react';
import { ensureFreshArticles, getLatestArticles } from '@/app/lib/services/articleService';

export const revalidate = 600;

async function getArticles() {
  try {
    await ensureFreshArticles();
    return await getLatestArticles(25);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return [];
  }
}

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
      {/* Index marker */}
      <div className="absolute top-3 left-3 z-20 font-mono text-[10px] text-zinc-700 group-hover:text-[#FF6B35] tracking-widest tabular-nums transition-colors">
        #{String(index + 1).padStart(2, '0')}
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#FF6B35] z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#FF6B35]/0 group-hover:border-[#FF6B35] transition-colors duration-500 z-20 pointer-events-none" />

      {/* Image (5/12) */}
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

      {/* Content (7/12) */}
      <div className="md:col-span-7 p-6 md:p-8 flex flex-col gap-4">

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-3 text-[10px] font-mono uppercase tracking-widest">
          {article.news_site && (
            <span className="font-black text-[#FF6B35]">
              {article.news_site}
            </span>
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

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight text-white group-hover:text-[#18BBF7] transition-colors">
          {article.title}
        </h2>

        {/* Summary */}
        {article.summary && (
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed line-clamp-4">
            {article.summary}
          </p>
        )}

        {/* Footer: authors + CTA */}
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

export default async function ArticlesPage() {
  const articles = (await getArticles()) as unknown as Article[];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#FF6B35] selection:text-black pb-24">

      {/* Sticky Header */}
      <div className="border-b border-white/10 bg-black/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2 font-mono text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
            Return.Terminal
          </Link>
          <div className="flex items-center gap-3">
            <Newspaper className="w-4 h-4 text-[#18BBF7]" />
            <span className="font-mono text-[10px] text-[#18BBF7] uppercase tracking-[0.4em] hidden sm:inline">
              Orbital News Archive
            </span>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full bg-[#FF6B35] opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 bg-[#FF6B35]" />
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16">

        {/* Page Title */}
        <div className="mb-12 md:mb-16 border-b border-white/10 pb-8">
          <div className="flex items-center gap-2 text-zinc-500 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.5em]">Briefings.All</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">
            Latest Briefings
          </h1>
          <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
            {articles.length} {articles.length === 1 ? 'Dispatch' : 'Dispatches'} on record
            <span className="text-zinc-700"> // </span>
            <span className="text-[#18BBF7]">Articles open in source</span>
          </p>
        </div>

        {/* Feed */}
        {articles.length > 0 ? (
          <div className="space-y-6 md:space-y-8">
            {articles.map((article, index) => (
              <ArticleRow key={article.id} article={article} index={index} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 border border-dashed border-zinc-900 bg-[#050505]">
            <Newspaper className="w-16 h-16 text-zinc-900 mb-6" strokeWidth={1} />
            <p className="text-zinc-600 font-mono text-sm uppercase tracking-[0.3em]">
              No Dispatches Found
            </p>
            <p className="text-zinc-700 font-mono text-[10px] uppercase tracking-widest mt-2">
              The archive is empty. Check back shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
