import Link from "next/link";
import { ChevronRight, ExternalLink, Newspaper, Rocket, Telescope } from "lucide-react";
import { getUpcomingLaunches, fetchUpcomingLaunches } from "@/app/lib/services/launchService";
import { ensureFreshArticles, getLatestArticles } from "@/app/lib/services/articleService";
import { getApod, type Apod } from "@/app/lib/services/nasaService";
import MiniCountdown from "@/components/ui/MiniCountdown";
import AppHeader from "@/components/sections/AppHeader";
import HomeAnimator from "@/components/sections/HomeAnimator";

export const revalidate = 60;

async function getLatestLaunch() {
  try {
    let launches = await getUpcomingLaunches(1);
    if (!launches || launches.length === 0) {
      await fetchUpcomingLaunches();
      launches = await getUpcomingLaunches(1);
    }
    return launches[0] || null;
  } catch (error) {
    console.error('Failed to fetch launch:', error);
    return null;
  }
}

async function getHomepageArticle() {
  try {
    await ensureFreshArticles();
    const articles = await getLatestArticles(1);
    return articles[0] || null;
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return null;
  }
}

export default async function Home() {
  const [launch, article, apod] = await Promise.all([
    getLatestLaunch(),
    getHomepageArticle(),
    getApod(),
  ]);

  return (
    <div className="h-dvh w-full bg-black text-white selection:bg-[#FF6B35] selection:text-black flex flex-col md:overflow-hidden">
      <AppHeader />

      {/* BLOCK GRID — desktop: 12-col / 2-row constrained to viewport.
          Mobile: vertical stack, scrollable. */}
      <main className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 md:grid-rows-2 gap-px bg-white/10 md:overflow-hidden">
        <BlockApod apod={apod} />
        <BlockLaunch launch={launch} />
        <BlockArticle article={article} />
      </main>

      <HomeAnimator />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block 01 — Astronomy Picture of the Day                            */
/* ------------------------------------------------------------------ */

function BlockApod({ apod }: { apod: Apod | null }) {
  const imageSrc = apod?.media_type === 'image' ? apod.url : apod?.thumbnail_url;
  const externalUrl = apod?.hdurl || apod?.url;

  return (
    <section
      data-home-block
      className="relative md:col-span-7 md:row-span-2 bg-black overflow-hidden group min-h-[55vh] md:min-h-0"
    >
      {imageSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={apod?.title || 'NASA APOD'}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:opacity-60 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-black/50 via-transparent to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Telescope className="w-24 h-24 text-zinc-900" strokeWidth={0.8} />
        </div>
      )}

      <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-[#FF6B35] z-10 pointer-events-none" />

      <div className="absolute top-4 left-12 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]">
        <span className="font-black text-[#FF6B35]">[01]</span>
        <span className="text-zinc-500">/</span>
        <span className="text-zinc-300 font-bold">Cosmic Observation</span>
      </div>

      <div className="relative z-10 h-full flex flex-col justify-end p-5 md:p-10 lg:p-12 pt-12 md:pt-16">
        <div className="max-w-3xl">
          <p data-home-reveal className="font-mono text-[10px] text-[#18BBF7] uppercase tracking-[0.3em] mb-3">
            NASA / Astronomy Picture Of The Day / {apod?.date || '—'}{apod?.media_type === 'video' ? ' / Video' : ''}
          </p>
          <h1 data-home-reveal className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-[0.95] mb-4">
            {apod?.title || 'Cosmic feed unavailable'}
          </h1>
          {apod?.explanation ? (
            <p data-home-reveal className="hidden md:block text-sm text-zinc-300 line-clamp-2 lg:line-clamp-3 mb-5 max-w-2xl leading-relaxed">
              {apod.explanation}
            </p>
          ) : (
            <p data-home-reveal className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-5">
              Awaiting telemetry from api.nasa.gov
            </p>
          )}
          <div data-home-reveal className="flex flex-wrap items-center gap-4">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group/cta inline-flex items-center gap-2 px-4 py-2 border border-white/30 font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
              >
                {apod?.media_type === 'video' ? 'Watch Source' : 'View HD'}
                <ExternalLink className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
              </a>
            )}
            {apod?.copyright && (
              <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest truncate max-w-xs">
                © {apod.copyright.trim()}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Block 02 — Next Primary Objective                                  */
/* ------------------------------------------------------------------ */

function BlockLaunch({ launch }: { launch: any }) {
  if (!launch) {
    return (
      <BlockEmpty
        gridClass="md:col-span-5"
        indexLabel="[02]"
        label="Next Primary Objective"
        message="No launch on manifest"
        accent="cyan"
      />
    );
  }

  return (
    <section
      data-home-block
      className="relative md:col-span-5 bg-black overflow-hidden group min-h-[55vh] md:min-h-0"
    >
      {launch.image?.image_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={launch.image.image_url}
            alt={launch.name}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:opacity-60 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
        </>
      )}

      <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-[#18BBF7] z-10 pointer-events-none" />

      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]">
        <span className="font-black text-[#18BBF7]">[02]</span>
        <span className="text-zinc-500">/</span>
        <span className="text-zinc-300 font-bold">Next Primary Objective</span>
      </div>

      <div className="relative z-10 h-full min-h-0 flex flex-col justify-between p-4 md:p-6 pt-12 md:pt-14 gap-3">
        <div className="min-h-0">
          <p data-home-reveal className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-widest font-black mb-2">
            {launch.launch_service_provider?.name || 'Unknown Provider'}
          </p>
          <h2 data-home-reveal className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tight leading-tight mb-4 line-clamp-2">
            {launch.name}
          </h2>
          <div data-home-reveal>
            <MiniCountdown launchDate={launch.date} statusName={launch.status?.name} />
          </div>
        </div>

        <div data-home-reveal className="flex flex-wrap items-end justify-between gap-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 min-w-0">
            <p className="truncate">{launch.pad?.location?.name || launch.pad?.name || 'Unknown Pad'}</p>
            <p className="text-zinc-300 mt-1 tabular-nums">
              {new Date(launch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="text-zinc-700 mx-1">/</span>
              {new Date(launch.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
          <Link
            href={`/launches/${launch.slug}`}
            className="group/cta inline-flex items-center gap-2 px-4 py-2 bg-[#18BBF7] text-black font-mono text-[10px] uppercase tracking-widest font-black hover:bg-white transition-colors whitespace-nowrap"
          >
            Mission Intel
            <ChevronRight className="w-3 h-3 transition-transform group-hover/cta:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Block 03 — Orbital News Feed                                       */
/* ------------------------------------------------------------------ */

function BlockArticle({ article }: { article: any }) {
  if (!article) {
    return (
      <BlockEmpty
        gridClass="md:col-span-5"
        indexLabel="[03]"
        label="Orbital News Feed"
        message="No dispatches available"
        accent="orange"
      />
    );
  }

  const publishedDate = new Date(article.published_at);

  return (
    <section
      data-home-block
      className="relative md:col-span-5 bg-black overflow-hidden group min-h-[55vh] md:min-h-0"
    >
      {article.image_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image_url}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:opacity-50 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/70 to-black/40" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
        </>
      )}

      <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-[#FF6B35] z-10 pointer-events-none" />

      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]">
        <span className="text-zinc-300 font-bold hidden sm:inline">Orbital News Feed</span>
        <span className="text-zinc-500 hidden sm:inline">/</span>
        <span className="font-black text-[#FF6B35]">[03]</span>
      </div>

      <div className="relative z-10 h-full min-h-0 flex flex-col justify-between p-4 md:p-6 pt-12 md:pt-14 gap-3">
        <div className="min-h-0">
          <p data-home-reveal className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-widest font-black mb-2">
            {article.news_site || 'Unknown Source'}
            <span className="text-zinc-700 mx-2">/</span>
            <span className="text-zinc-400 tabular-nums">
              {publishedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </p>
          <h2 data-home-reveal className="text-lg md:text-xl lg:text-2xl font-black uppercase tracking-tight leading-tight line-clamp-3 mb-3">
            {article.title}
          </h2>
          {article.summary && (
            <p data-home-reveal className="hidden lg:block text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {article.summary}
            </p>
          )}
        </div>

        <div data-home-reveal className="flex items-center justify-between gap-3">
          <Link
            href="/articles"
            className="font-mono text-[9px] text-zinc-500 hover:text-[#18BBF7] uppercase tracking-widest transition-colors"
          >
            All Articles →
          </Link>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/cta inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-black font-mono text-[10px] uppercase tracking-widest font-black hover:bg-white transition-colors whitespace-nowrap"
            >
              Read
              <ExternalLink className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Empty / fallback block                                             */
/* ------------------------------------------------------------------ */

function BlockEmpty({
  gridClass,
  indexLabel,
  label,
  message,
  accent,
}: {
  gridClass: string;
  indexLabel: string;
  label: string;
  message: string;
  accent: 'orange' | 'cyan';
}) {
  const accentClass = accent === 'orange' ? 'text-[#FF6B35]' : 'text-[#18BBF7]';
  const Icon = accent === 'cyan' ? Rocket : Newspaper;
  return (
    <section data-home-block className={`relative bg-black overflow-hidden min-h-[40vh] md:min-h-0 ${gridClass}`}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] font-black">
        <span className={accentClass}>{indexLabel}</span>
        <span className="text-zinc-500">/</span>
        <span className="text-zinc-300">{label}</span>
      </div>
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Icon className="w-10 h-10 text-zinc-800" strokeWidth={1} />
        <p className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest">{message}</p>
      </div>
    </section>
  );
}
