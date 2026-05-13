import { Newspaper, ArrowUpRight, Rocket } from 'lucide-react';

interface ArticleCardProps {
  article: {
    id: number;
    title: string;
    url?: string;
    image_url?: string;
    news_site?: string;
    summary?: string;
    published_at: string | Date;
    featured?: boolean;
    launches?: Array<{ launch_id?: string; provider?: string }>;
  };
  variant?: 'default' | 'compact';
}

const ArticleCard = ({ article, variant = 'default' }: ArticleCardProps) => {
  const publishedDate = new Date(article.published_at);
  const hasLaunches = (article.launches?.length || 0) > 0;
  const imageHeight = variant === 'compact' ? 'h-40' : 'h-48';

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group h-full"
    >
      <div className="relative bg-black/90 backdrop-blur-xs border-2 border-[#18BBF7]/20 hover:border-[#18BBF7] hover:shadow-[0_0_24px_rgba(24,187,247,0.18)] hover:-translate-y-0.5 transition-all duration-500 h-full flex flex-col overflow-hidden">

        {/* Image / placeholder */}
        <div className="relative overflow-hidden">
          {article.image_url ? (
            <div className={`relative w-full ${imageHeight}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover brightness-90 transition-all duration-700 group-hover:scale-105 group-hover:brightness-100"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/30 to-transparent" />
            </div>
          ) : (
            <div className={`relative w-full ${imageHeight} bg-zinc-950 flex items-center justify-center border-b border-zinc-900`}>
              <Newspaper className="w-10 h-10 text-zinc-800" strokeWidth={1} />
              <span className="absolute bottom-3 left-3 font-mono text-[9px] text-zinc-700 uppercase tracking-[0.3em]">
                No Visual
              </span>
            </div>
          )}

          {/* Featured badge */}
          {article.featured && (
            <div className="absolute top-2 right-2 bg-[#FF6B35] px-2 py-1 font-mono text-[9px] font-bold tracking-widest text-black uppercase">
              Featured
            </div>
          )}

          {/* News site + launch badge overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            {article.news_site && (
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#FF6B35] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {article.news_site}
              </span>
            )}
            {hasLaunches && (
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-[#18BBF7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <Rocket className="w-3 h-3" />
                Linked
              </span>
            )}
          </div>

          {/* Permanent thin orange rail + hover sweep */}
          <div className="relative h-1 bg-[#FF6B35]/30">
            <div className="absolute inset-0 bg-[#FF6B35] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-base font-bold tracking-tight uppercase text-white group-hover:text-[#18BBF7] transition-colors line-clamp-3 leading-tight mb-3">
            {article.title}
          </h3>

          {article.summary && variant !== 'compact' && (
            <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-3 mb-4 flex-1">
              {article.summary}
            </p>
          )}

          <div className="mt-auto flex justify-between items-center gap-2 pt-3 border-t border-[#18BBF7]/15">
            <span className="font-mono text-[10px] text-zinc-400 tracking-wider uppercase tabular-nums">
              {publishedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-[#18BBF7] tracking-widest uppercase font-bold group-hover:gap-2 transition-all">
              Read
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
};

export default ArticleCard;
